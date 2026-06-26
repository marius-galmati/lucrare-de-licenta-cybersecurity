import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

const COLUMNS = [
  'code',
  'domain',
  'category',
  'answerType',
  'weightPoints',
  'textRo',
  'textEn',
  'recommendationRo',
  'recommendationEn',
  'optionsJson',
  'scoringInclusionRule',
  'metadataJson',
] as const;

type ColumnKey = (typeof COLUMNS)[number];

const REQUIRED: ColumnKey[] = ['code', 'domain', 'answerType', 'weightPoints', 'textRo', 'textEn'];

const ALLOWED_DOMAINS = ['risk', 'maturity', 'gate'] as const;
const ALLOWED_ANSWER_TYPES = ['yes_no', 'scale', 'multiple_choice', 'yes_no_unsure'] as const;

const EXAMPLE_ROWS = [
  {
    code: 'Q61',
    domain: 'risk',
    category: 'risk.iam',
    answerType: 'yes_no',
    weightPoints: '3',
    textRo: 'Aveți autentificare multi-factor activată pentru toate conturile administrative?',
    textEn: 'Do you have MFA enabled for all administrative accounts?',
    recommendationRo: 'Activați MFA pentru toate conturile cu privilegii.',
    recommendationEn: 'Enable MFA for all privileged accounts.',
    optionsJson: '',
    scoringInclusionRule: '',
    metadataJson: '',
  },
  {
    code: 'G14',
    domain: 'gate',
    category: '',
    answerType: 'yes_no_unsure',
    weightPoints: '0',
    textRo: 'Operați infrastructură cloud (AWS, Azure, GCP)?',
    textEn: 'Do you operate cloud infrastructure (AWS, Azure, GCP)?',
    recommendationRo: '',
    recommendationEn: '',
    optionsJson: '',
    scoringInclusionRule: '',
    metadataJson: '',
  },
];

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  parsed: {
    code: string;
    domain: string;
    category: string;
    answerType: string;
    weightPoints: number;
    textRo: string;
    textEn: string;
    recommendationRo: string | null;
    recommendationEn: string | null;
    optionsJson: any;
    scoringInclusionRule: string | null;
    metadataJson: any;
  } | null;
  errors: string[];
  existingCode: boolean;
  nextVersion: number;
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newCodes: number;
  newVersions: number;
  rows: ParsedRow[];
}

@Injectable()
export class QuestionsImportService {
  private readonly logger = new Logger(QuestionsImportService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // =========================================================================
  // GENERAREA ȘABLONULUI
  // =========================================================================

  generateCsvTemplate(): Buffer {
    const rows = [COLUMNS as readonly string[], ...EXAMPLE_ROWS.map((r) => COLUMNS.map((c) => r[c] ?? ''))];
    const csv = Papa.unparse(rows, { quotes: true });
    return Buffer.from(csv, 'utf8');
  }

  async generateXlsxTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CyberXscore';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Questions', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = COLUMNS.map((c) => ({
      header: c,
      key: c,
      width: c === 'textRo' || c === 'textEn' || c.startsWith('recommendation') ? 50 : 18,
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    for (const ex of EXAMPLE_ROWS) sheet.addRow(ex);

    // Validări de tip listă derulantă: acoperă rândurile 2..2000 pentru ca administratorii să poată lipi multe rânduri.
    const domainCol = COLUMNS.indexOf('domain') + 1;
    const answerTypeCol = COLUMNS.indexOf('answerType') + 1;
    const categoryCol = COLUMNS.indexOf('category') + 1;

    const categories = await this.prisma.scoringCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { key: true },
    });
    const categoryList = categories.map((c) => c.key).join(',');

    for (let r = 2; r <= 2000; r++) {
      sheet.getCell(r, domainCol).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`"${ALLOWED_DOMAINS.join(',')}"`],
      };
      sheet.getCell(r, answerTypeCol).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`"${ALLOWED_ANSWER_TYPES.join(',')}"`],
      };
      if (categoryList.length > 0 && categoryList.length < 250) {
        sheet.getCell(r, categoryCol).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${categoryList}"`],
        };
      }
    }

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // =========================================================================
  // PARSARE + VALIDARE
  // =========================================================================

  async parseAndValidate(filename: string, buffer: Buffer): Promise<ImportPreview> {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    let rawRows: Record<string, string>[];

    if (ext === 'csv') {
      rawRows = this.parseCsv(buffer);
    } else if (ext === 'xlsx' || ext === 'xlsm') {
      rawRows = await this.parseXlsx(buffer);
    } else {
      throw new BadRequestException(`Unsupported file type: .${ext}. Use .csv or .xlsx.`);
    }

    const validCategories = new Set(
      (await this.prisma.scoringCategory.findMany({ select: { key: true } })).map((c) => c.key),
    );

    const codes = rawRows.map((r) => String(r.code ?? '').trim()).filter(Boolean);
    const existingByCode = new Map<string, { maxVersion: number }>();
    if (codes.length > 0) {
      const found = await this.prisma.versionedQuestion.findMany({
        where: { code: { in: codes } },
        select: { code: true, version: true },
      });
      for (const q of found) {
        const cur = existingByCode.get(q.code);
        if (!cur || q.version > cur.maxVersion) {
          existingByCode.set(q.code, { maxVersion: q.version });
        }
      }
    }

    const seenCodes = new Set<string>();
    const result: ParsedRow[] = rawRows.map((raw, idx) => {
      const errors: string[] = [];
      const rowNumber = idx + 2; // antetul este rândul 1

      const code = String(raw.code ?? '').trim();
      const domain = String(raw.domain ?? '').trim();
      const category = String(raw.category ?? '').trim();
      const answerType = String(raw.answerType ?? '').trim();
      const weightPointsRaw = String(raw.weightPoints ?? '').trim();
      const textRo = String(raw.textRo ?? '').trim();
      const textEn = String(raw.textEn ?? '').trim();
      const recommendationRo = String(raw.recommendationRo ?? '').trim();
      const recommendationEn = String(raw.recommendationEn ?? '').trim();
      const optionsJsonStr = String(raw.optionsJson ?? '').trim();
      const scoringInclusionRule = String(raw.scoringInclusionRule ?? '').trim();
      const metadataJsonStr = String(raw.metadataJson ?? '').trim();

      // Câmpuri obligatorii
      for (const key of REQUIRED) {
        const v = String((raw as any)[key] ?? '').trim();
        if (!v) errors.push(`Missing required column: ${key}`);
      }
      if (domain !== 'gate' && !category) {
        errors.push('Column `category` is required when domain is not `gate`');
      }

      // Validarea valorilor de tip enum
      if (domain && !(ALLOWED_DOMAINS as readonly string[]).includes(domain)) {
        errors.push(`Invalid domain '${domain}'. Allowed: ${ALLOWED_DOMAINS.join(', ')}`);
      }
      if (answerType && !(ALLOWED_ANSWER_TYPES as readonly string[]).includes(answerType)) {
        errors.push(`Invalid answerType '${answerType}'. Allowed: ${ALLOWED_ANSWER_TYPES.join(', ')}`);
      }

      // Punctaj
      let weightPoints = 0;
      if (weightPointsRaw) {
        const n = Number(weightPointsRaw);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
          errors.push(`weightPoints must be a non-negative integer (got '${weightPointsRaw}')`);
        } else {
          weightPoints = n;
        }
      }

      // Categoria trebuie să existe (cu excepția gate-urilor)
      if (domain !== 'gate' && category && !validCategories.has(category)) {
        errors.push(`Category '${category}' does not exist in scoring_categories`);
      }

      // Coloane JSON
      let optionsJson: any = null;
      if (optionsJsonStr) {
        try { optionsJson = JSON.parse(optionsJsonStr); }
        catch { errors.push(`optionsJson is not valid JSON`); }
      }
      let metadataJson: any = null;
      if (metadataJsonStr) {
        try { metadataJson = JSON.parse(metadataJsonStr); }
        catch { errors.push(`metadataJson is not valid JSON`); }
      }

      // Cod duplicat în cadrul aceluiași fișier
      if (code && seenCodes.has(code)) {
        errors.push(`Duplicate code '${code}' appears earlier in this file`);
      }
      if (code) seenCodes.add(code);

      const existing = existingByCode.get(code);
      const existingCodeFlag = !!existing;
      const nextVersion = existing ? existing.maxVersion + 1 : 1;

      const isValid = errors.length === 0;

      return {
        rowNumber,
        raw,
        parsed: isValid
          ? {
              code,
              domain,
              category,
              answerType,
              weightPoints,
              textRo,
              textEn,
              recommendationRo: recommendationRo || null,
              recommendationEn: recommendationEn || null,
              optionsJson,
              scoringInclusionRule: scoringInclusionRule || null,
              metadataJson,
            }
          : null,
        errors,
        existingCode: existingCodeFlag,
        nextVersion,
      };
    });

    const validRows = result.filter((r) => r.errors.length === 0);
    return {
      totalRows: result.length,
      validRows: validRows.length,
      invalidRows: result.length - validRows.length,
      newCodes: validRows.filter((r) => !r.existingCode).length,
      newVersions: validRows.filter((r) => r.existingCode).length,
      rows: result,
    };
  }

  private parseCsv(buffer: Buffer): Record<string, string>[] {
    const text = buffer.toString('utf8').replace(/^﻿/, '');
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });
    if (result.errors && result.errors.length > 0) {
      const msg = result.errors.slice(0, 5).map((e) => `${e.message} (row ${e.row ?? '?'})`).join('; ');
      throw new BadRequestException(`CSV parse error: ${msg}`);
    }
    return (result.data as Record<string, string>[]).filter((r) =>
      Object.values(r).some((v) => String(v ?? '').trim() !== ''),
    );
  }

  private async parseXlsx(buffer: Buffer): Promise<Record<string, string>[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('XLSX has no worksheet');

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? '').trim();
    });
    if (headers.length === 0) throw new BadRequestException('XLSX header row is empty');

    const rows: Record<string, string>[] = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const obj: Record<string, string> = {};
      let hasAny = false;
      for (let c = 1; c <= headers.length; c++) {
        const key = headers[c - 1];
        if (!key) continue;
        const cell = row.getCell(c);
        let val: string;
        if (cell.value === null || cell.value === undefined) val = '';
        else if (typeof cell.value === 'object' && 'richText' in (cell.value as any)) {
          val = (cell.value as any).richText.map((rt: any) => rt.text).join('');
        } else if (typeof cell.value === 'object' && 'text' in (cell.value as any)) {
          val = String((cell.value as any).text ?? '');
        } else if (cell.value instanceof Date) {
          val = cell.value.toISOString();
        } else {
          val = String(cell.value);
        }
        obj[key] = val;
        if (val.trim() !== '') hasAny = true;
      }
      if (hasAny) rows.push(obj);
    }
    return rows;
  }

  // =========================================================================
  // COMMIT (salvare definitivă)
  // =========================================================================

  async commit(userId: string, filename: string, buffer: Buffer): Promise<{
    created: number;
    summary: { code: string; version: number }[];
    preview: ImportPreview;
  }> {
    const preview = await this.parseAndValidate(filename, buffer);
    if (preview.invalidRows > 0) {
      throw new BadRequestException(
        `${preview.invalidRows} of ${preview.totalRows} rows have validation errors. Fix the file and retry.`,
      );
    }
    if (preview.validRows === 0) {
      throw new BadRequestException('No valid rows to import.');
    }

    const summary: { code: string; version: number }[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const row of preview.rows) {
        if (!row.parsed) continue;
        const p = row.parsed;

        const latest = await tx.versionedQuestion.findFirst({
          where: { code: p.code },
          orderBy: { version: 'desc' },
        });

        const newVersion = latest ? latest.version + 1 : 1;

        if (latest && latest.status === 'active') {
          await tx.versionedQuestion.update({
            where: { id: latest.id },
            data: { status: 'archived' },
          });
        }

        const created = await tx.versionedQuestion.create({
          data: {
            code: p.code,
            version: newVersion,
            status: 'active',
            domain: p.domain,
            category: p.category,
            answerType: p.answerType,
            weightPoints: p.weightPoints,
            textRo: p.textRo,
            textEn: p.textEn,
            recommendationRo: p.recommendationRo,
            recommendationEn: p.recommendationEn,
            optionsJson: p.optionsJson ?? null,
            scoringInclusionRule: p.scoringInclusionRule,
            metadataJson: p.metadataJson ?? null,
            createdByUserId: userId,
          },
        });

        summary.push({ code: created.code, version: created.version });
      }
    });

    await this.auditService.log(userId, 'questions_bulk_import', 'QUESTION', undefined, {
      filename,
      totalRows: preview.totalRows,
      created: summary.length,
      newCodes: preview.newCodes,
      newVersions: preview.newVersions,
    });

    return { created: summary.length, summary, preview };
  }
}
