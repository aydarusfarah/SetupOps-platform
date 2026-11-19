import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { GoogleGenAI, Type } from '@google/genai';
import { createRateLimiter } from './src/lib/rateLimit.ts';

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json({ limit: '1mb' }));
// Behind Cloud Run / a reverse proxy: trust the first hop so req.ip is the client.
app.set('trust proxy', 1);

// The AI endpoint is reachable from the public demo: cap calls per client IP.
const diagnoseLimiter = createRateLimiter({
  limit: Number(process.env.DIAGNOSE_RATE_LIMIT) || 10,
  windowMs: 10 * 60_000,
});

/**
 * Gemini client. Two modes:
 *  - GEMINI_API_KEY set → Gemini Developer API with that key (local development).
 *  - VERTEX_PROJECT set → Vertex AI via Application Default Credentials: on Cloud Run
 *    the service account authenticates, so no API key exists that could leak.
 * Returns null when neither is configured.
 */
function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    return new GoogleGenAI({ apiKey });
  }
  const project = process.env.VERTEX_PROJECT;
  if (project) {
    return new GoogleGenAI({
      vertexai: true,
      project,
      location: process.env.VERTEX_LOCATION || 'global',
    });
  }
  return null;
}

interface DiagnoseRequestBody {
  lang?: 'de' | 'en';
  ticket?: {
    ticketNr?: string;
    titel?: string;
    beschreibung?: string;
    kategorie?: string;
    prioritaet?: string;
  };
  device?: {
    assetTag?: string;
    typ?: string;
    hersteller?: string;
    modell?: string;
    seriennummer?: string;
    cpu?: string;
    ramGB?: number;
    speicherTyp?: string;
    speicherGB?: number;
    betriebssystem?: string;
    status?: string;
  } | null;
  checklistSummary?: {
    done?: number;
    total?: number;
    completedItems?: string[];
    pendingItems?: string[];
  } | null;
  recentComments?: Array<{
    authorName?: string;
    text?: string;
  }>;
  recentHistory?: Array<{
    field?: string;
    oldValue?: string;
    newValue?: string;
    userName?: string;
  }>;
}

app.post('/api/diagnose', async (req, res) => {
  const body = req.body as DiagnoseRequestBody;
  const isEn = body?.lang === 'en';
  const rate = diagnoseLimiter(req.ip ?? 'unknown');
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    res.status(429).json({
      error: isEn
        ? `Too many AI diagnostics requests. Please try again in ${Math.ceil(rate.retryAfterSec / 60)} min.`
        : `Zu viele KI-Diagnose-Anfragen. Bitte in ${Math.ceil(rate.retryAfterSec / 60)} Min. erneut versuchen.`,
    });
    return;
  }
  try {
    const ticket = body?.ticket;
    const device = body?.device;
    const checklistSummary = body?.checklistSummary;
    const recentComments = Array.isArray(body?.recentComments) ? body.recentComments : [];
    const recentHistory = Array.isArray(body?.recentHistory) ? body.recentHistory : [];

    if (!ticket || !ticket.titel?.trim() || !ticket.beschreibung?.trim()) {
      res.status(400).json({
        error: isEn
          ? 'Ticket title and description are required for AI diagnostics.'
          : 'Tickettitel und Beschreibung sind für die KI-Fehlerdiagnose erforderlich.',
      });
      return;
    }

    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: isEn
          ? 'AI diagnostics are not configured on this server (set GEMINI_API_KEY or VERTEX_PROJECT).'
          : 'Die KI-Diagnose ist auf diesem Server nicht konfiguriert (GEMINI_API_KEY oder VERTEX_PROJECT setzen).',
      });
      return;
    }

    const deviceInfo = device
      ? isEn
        ? [
            `Asset Tag: ${device.assetTag ?? 'Unknown'}`,
            `Type: ${device.typ ?? 'Unknown'}`,
            `Manufacturer/Model: ${device.hersteller ?? ''} ${device.modell ?? ''}`.trim(),
            `CPU: ${device.cpu || 'Not specified'}`,
            `RAM: ${device.ramGB ?? 0} GB`,
            `Storage: ${device.speicherGB ?? 0} GB ${device.speicherTyp ?? ''}`.trim(),
            `Operating System: ${device.betriebssystem ?? 'Unknown'}`,
            `Device Status: ${device.status ?? 'Unknown'}`,
          ].join('\n')
        : [
            `Asset-Tag: ${device.assetTag ?? 'Unbekannt'}`,
            `Typ: ${device.typ ?? 'Unbekannt'}`,
            `Hersteller/Modell: ${device.hersteller ?? ''} ${device.modell ?? ''}`.trim(),
            `CPU: ${device.cpu || 'Nicht angegeben'}`,
            `RAM: ${device.ramGB ?? 0} GB`,
            `Speicher: ${device.speicherGB ?? 0} GB ${device.speicherTyp ?? ''}`.trim(),
            `Betriebssystem: ${device.betriebssystem ?? 'Unbekannt'}`,
            `Gerätestatus: ${device.status ?? 'Unbekannt'}`,
          ].join('\n')
      : isEn
        ? 'No linked device specs.'
        : 'Keine Gerätedaten verknüpft.';

    const contextSections: string[] = [];

    if (checklistSummary && typeof checklistSummary.total === 'number' && checklistSummary.total > 0) {
      const completed = (checklistSummary.completedItems ?? []).slice(0, 15);
      const pending = (checklistSummary.pendingItems ?? []).slice(0, 15);
      if (isEn) {
        contextSections.push(
          [
            `SETUP CHECKLIST PROGRESS (${checklistSummary.done ?? 0}/${checklistSummary.total}):`,
            `Already verified: ${completed.length > 0 ? completed.join('; ') : 'None yet'}`,
            `Pending checks: ${pending.length > 0 ? pending.join('; ') : 'None'}`,
          ].join('\n'),
        );
      } else {
        contextSections.push(
          [
            `CHECKLISTEN-FORTSCHRITT (${checklistSummary.done ?? 0}/${checklistSummary.total}):`,
            `Bereits erledigt: ${completed.length > 0 ? completed.join('; ') : 'Noch keine'}`,
            `Offene Prüfpunkte: ${pending.length > 0 ? pending.join('; ') : 'Keine'}`,
          ].join('\n'),
        );
      }
    }

    if (recentComments.length > 0) {
      const commentLines = recentComments
        .slice(-6)
        .filter((c) => c.text?.trim())
        .map((c) => `- ${c.authorName || (isEn ? 'Technician' : 'Techniker')}: ${c.text!.trim()}`);
      if (commentLines.length > 0) {
        contextSections.push(
          [
            isEn ? 'RECENT TECHNICIAN COMMENTS:' : 'LETZTE TECHNIKER-KOMMENTARE:',
            ...commentLines,
          ].join('\n'),
        );
      }
    }

    if (recentHistory.length > 0) {
      const historyLines = recentHistory
        .slice(0, 8)
        .filter((h) => h.field?.trim())
        .map(
          (h) =>
            `- ${h.field}: ${h.oldValue ?? '—'} -> ${h.newValue ?? '—'} (${h.userName ?? ''})`.trim(),
        );
      if (historyLines.length > 0) {
        contextSections.push(
          [
            isEn ? 'RECENT DEVICE & TICKET HISTORY:' : 'AKTUELLER GERÄTE- & TICKET-VERLAUF:',
            ...historyLines,
          ].join('\n'),
        );
      }
    }

    const prompt = isEn
      ? [
          'Analyze the following IT workshop ticket, device specifications, and workshop context.',
          '',
          'TICKET:',
          `Number: ${ticket.ticketNr ?? 'New'}`,
          `Category: ${ticket.kategorie ?? 'Unknown'}`,
          `Priority: ${ticket.prioritaet ?? 'Medium'}`,
          `Title: ${ticket.titel}`,
          `Description: ${ticket.beschreibung}`,
          '',
          'DEVICE SPECIFICATIONS:',
          deviceInfo,
          ...(contextSections.length > 0 ? ['', ...contextSections.flatMap((s) => [s, ''])] : []),
        ]
          .join('\n')
          .trim()
      : [
          'Analysiere das folgende IT-Werkstatt-Ticket, die Gerätespezifikationen und den Werkstatt-Kontext.',
          '',
          'TICKET:',
          `Nummer: ${ticket.ticketNr ?? 'Neu'}`,
          `Kategorie: ${ticket.kategorie ?? 'Unbekannt'}`,
          `Priorität: ${ticket.prioritaet ?? 'Mittel'}`,
          `Titel: ${ticket.titel}`,
          `Beschreibung: ${ticket.beschreibung}`,
          '',
          'GERÄTESPEZIFIKATIONEN:',
          deviceInfo,
          ...(contextSections.length > 0 ? ['', ...contextSections.flatMap((s) => [s, ''])] : []),
        ]
          .join('\n')
          .trim();

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxAttempts = 3;
    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
    let lastErr: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction: isEn
              ? 'You are a senior IT workshop technician (2nd/3rd level hardware and Windows support). Respond concisely in precise technical English. Account for any already-verified checklist steps, recent technician comments, and audit history so you do not repeat checks already confirmed as done. Provide at most 3 probable root causes and 3 to 5 structured troubleshooting steps ordered from simple to complex (hardware/cable/power checks first, followed by firmware/BIOS and software/drivers/Windows).'
              : 'Du bist ein erfahrener IT-Werkstatt-Techniker (2nd/3rd Level Hardware & Windows Support). Antworte präzise auf Deutsch im sachlichen Fachjargon. Berücksichtige bereits erledigte Checklistenpunkte, Techniker-Kommentare und den Verlauf, um bereits bestätigte Prüfungen nicht unnötig zu wiederholen. Nenne maximal 3 wahrscheinliche Ursachen und 3 bis 5 strukturierte Diagnoseschritte von einfach zu komplex (zuerst Hardware-/Kabel-/Stromprüfungen, danach Firmware/BIOS und Software/Treiber/Windows).',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                wahrscheinlicheUrsachen: {
                  type: Type.ARRAY,
                  description: isEn
                    ? 'Up to 3 probable technical root causes.'
                    : 'Maximal 3 wahrscheinliche technische Ursachen.',
                  items: { type: Type.STRING },
                },
                schritte: {
                  type: Type.ARRAY,
                  description: isEn
                    ? '3 to 5 diagnostic steps from simple to complex, hardware checks first then software.'
                    : '3 bis 5 Diagnoseschritte von einfach nach komplex, Hardware-Checks zuerst, dann Software.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      titel: { type: Type.STRING },
                      beschreibung: { type: Type.STRING },
                      ebene: { type: Type.STRING },
                    },
                    required: ['titel', 'beschreibung', 'ebene'],
                  },
                },
              },
              required: ['wahrscheinlicheUrsachen', 'schritte'],
            },
          },
        });
        break;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isTransient =
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED');
        if (isTransient && attempt < maxAttempts) {
          await sleep(900 * attempt);
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      throw lastErr ?? new Error('Keine Antwort vom KI-Dienst.');
    }

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({
        error: isEn
          ? 'The AI response was empty. Please try again.'
          : 'Die KI-Antwort war leer. Bitte versuchen Sie es erneut.',
      });
      return;
    }

    const parsed = JSON.parse(rawText) as {
      wahrscheinlicheUrsachen?: string[];
      schritte?: Array<{ titel: string; beschreibung: string; ebene: string }>;
    };

    res.json({
      wahrscheinlicheUrsachen: (parsed.wahrscheinlicheUrsachen ?? []).slice(0, 3),
      schritte: (parsed.schritte ?? []).slice(0, 5),
    });
  } catch (err) {
    console.error('Gemini diagnosis error:', err);
    const raw = err instanceof Error ? err.message : String(err);
    let friendly = isEn
      ? 'AI diagnostics could not be generated right now.'
      : 'Die KI-Diagnose konnte momentan nicht erstellt werden.';
    let status = 500;

    if (raw.includes('503') || raw.includes('UNAVAILABLE')) {
      status = 503;
      friendly = isEn
        ? 'The AI diagnostics service is temporarily experiencing high demand. Please retry in a few seconds.'
        : 'Der KI-Diagnosedienst ist momentan vorübergehend stark ausgelastet. Bitte versuchen Sie es in einigen Sekunden erneut.';
    } else if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
      status = 429;
      friendly = isEn
        ? 'The AI service rate limit was briefly reached. Please retry shortly.'
        : 'Das Anfrage-Limit des KI-Dienstes wurde kurzzeitig erreicht. Bitte versuchen Sie es gleich erneut.';
    } else if (raw.includes('API_KEY_INVALID') || raw.includes('403') || raw.includes('PERMISSION_DENIED')) {
      status = 502;
      friendly = isEn
        ? 'The server AI API key was rejected. Please verify Secrets configuration.'
        : 'Der Server-API-Schlüssel für den KI-Dienst wurde abgelehnt. Bitte prüfen Sie die Secrets-Konfiguration.';
    }

    res.status(status).json({ error: friendly });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--production');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build nicht gefunden. Bitte npm run build ausführen.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SetupOps server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SetupOps server:', err);
  process.exit(1);
});
