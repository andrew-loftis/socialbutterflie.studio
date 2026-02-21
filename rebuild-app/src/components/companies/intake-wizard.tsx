"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { useAppState } from '@/components/shell/app-state';
import { firebaseStorage } from '@/lib/firebase/client';
import { updateCompany } from '@/lib/firebase/company-store';

type IntakeStep = {
  key: string;
  title: string;
  intent: string;
  questions: string[];
  imageFocused?: boolean;
};

const STEPS: IntakeStep[] = [
  {
    key: 'identity',
    title: 'Brand Identity',
    intent: 'Define core brand signals so every generated asset stays consistent and recognizable.',
    questions: [
      'What is the exact legal and public-facing brand name?',
      'What is your short tagline?',
      'What mission statement should appear in content?',
      'What mascot or icon should repeat in brand visuals?',
      'Which 3 words best describe the brand personality?',
      'What are your non-negotiable logo usage rules?',
      'List your primary and secondary colors.',
      'What legacy branding should be avoided?',
      'Who are your direct brand competitors?',
      'What makes this brand unmistakably yours?',
    ],
    imageFocused: true,
  },
  {
    key: 'voice',
    title: 'Voice and Messaging',
    intent: 'Set verbal guardrails for captions, CTAs, and persuasion style.',
    questions: [
      'Describe your brand voice in one paragraph.',
      'What tone should captions always use?',
      'What phrases should never appear?',
      'What CTA style converts best for your audience?',
      'Give three sample posts that feel perfect.',
      'Give three sample posts that feel off-brand.',
      'How direct or playful should language be?',
      'How technical should copy be?',
      'What credibility markers should be emphasized?',
      'How should objections be handled in messaging?',
    ],
  },
  {
    key: 'visual',
    title: 'Visual Direction',
    intent: 'Capture visual references and production direction that AI must follow.',
    questions: [
      'What visual styles should repeat every week?',
      'What visual styles should be avoided?',
      'What camera/framing preferences define your look?',
      'What typography style best matches your brand?',
      'What mood should your content evoke?',
      'Which references or creators represent your ideal aesthetic?',
      'How minimal or dense should layouts feel?',
      'What texture/lighting preferences should AI prioritize?',
      'What ratio/crop constraints matter most?',
      'What recurring motifs should be visible?',
    ],
    imageFocused: true,
  },
  {
    key: 'audience',
    title: 'Audience and Positioning',
    intent: 'Clarify who this content is for and how messaging should convert.',
    questions: [
      'Who is your primary audience persona?',
      'What geographies matter first?',
      'What core audience objections are common?',
      'What transformation do you promise to audience?',
      'What trust signals matter most for conversion?',
      'What audience segment should be excluded?',
      'Which channels generate best audience quality?',
      'How should messaging differ by platform?',
      'What urgency triggers are acceptable?',
      'What perception should audience have after 30 days?',
    ],
  },
  {
    key: 'content',
    title: 'Content Strategy',
    intent: 'Translate brand context into practical content operations and review policy.',
    questions: [
      'List top 5 content pillars.',
      'What weekly cadence is realistic?',
      'Which formats perform best currently?',
      'What content goals are highest priority?',
      'What topics are prohibited?',
      'What recurring campaign themes should repeat?',
      'How should seasonal campaigns be handled?',
      'What metrics define content success?',
      'How should community interaction be reflected in posts?',
      'What is your approval policy before publishing?',
    ],
  },
  {
    key: 'uploads',
    title: 'Asset Uploads',
    intent: 'Upload logos, style guides, and references used by team workflows and AI prompts.',
    questions: [
      'Upload logos (transparent preferred).',
      'Upload mascots/icons.',
      'Upload banner assets.',
      'Upload recurring visual references.',
      'Upload brand style guides if available.',
    ],
    imageFocused: true,
  },
  {
    key: 'ai',
    title: 'AI Prompt Context',
    intent: 'Finalize AI instruction defaults, constraints, and fallback behavior.',
    questions: [
      'What should AI always remember before generating?',
      'What should AI never generate?',
      'What visual keywords should carry highest weight?',
      'What voice constraints are mandatory?',
      'What default negative prompt should be applied?',
      'What model parameters should default in studio?',
      'How strict should brand enforcement be?',
      'Should human names/faces be used? Under what constraints?',
      'What legal/compliance boundaries are required?',
      'What fallback style should AI use when uncertain?',
    ],
  },
  {
    key: 'review',
    title: 'Review and Confirm',
    intent: 'Confirm accuracy and lock in the operating context for this company.',
    questions: ['Confirm final summary and approve profile activation.'],
    imageFocused: true,
  },
];

function storageKey(companyId: string) {
  return `intake:${companyId}`;
}

export function IntakeWizard({ companyId }: { companyId: string }) {
  const { appContext } = useAppState();
  const [initialState] = useState(() => {
    if (typeof window === 'undefined') {
      return { stepIndex: 0, answers: {} as Record<string, string>, uploadLog: [] as string[] };
    }
    const raw = localStorage.getItem(storageKey(companyId));
    if (!raw) {
      return { stepIndex: 0, answers: {} as Record<string, string>, uploadLog: [] as string[] };
    }
    try {
      const parsed = JSON.parse(raw) as { stepIndex: number; answers: Record<string, string>; uploadLog: string[] };
      return {
        stepIndex: parsed.stepIndex || 0,
        answers: parsed.answers || {},
        uploadLog: parsed.uploadLog || [],
      };
    } catch {
      return { stepIndex: 0, answers: {} as Record<string, string>, uploadLog: [] as string[] };
    }
  });

  const [stepIndex, setStepIndex] = useState(initialState.stepIndex);
  const [answers, setAnswers] = useState<Record<string, string>>(initialState.answers);
  const [uploadLog, setUploadLog] = useState<string[]>(initialState.uploadLog);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const step = STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);
  const shouldShowUploadZone = step.imageFocused || step.key === 'review';

  useEffect(() => {
    localStorage.setItem(storageKey(companyId), JSON.stringify({ stepIndex, answers, uploadLog }));
  }, [answers, companyId, stepIndex, uploadLog]);

  const promptKeys = useMemo(() => step.questions.map((_, idx) => `${step.key}:${idx}`), [step.key, step.questions]);

  async function onUpload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    try {
      for (const file of list) {
        if (!firebaseStorage) {
          setUploadLog((prev) => [`[local] ${file.name}`, ...prev]);
          continue;
        }
        const path = `workspaces/${appContext.workspaceId}/companies/${companyId}/references/${Date.now()}-${file.name}`;
        const fileRef = ref(firebaseStorage, path);
        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(fileRef, file);
          task.on('state_changed', () => undefined, reject, async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            setUploadLog((prev) => [`${file.name} -> ${url}`, ...prev]);
            resolve();
          });
        });
      }
      setStatus(`Uploaded ${list.length} file${list.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function saveProgress() {
    setStatus('Saving...');
    const payload = {
      companyId,
      step: stepIndex,
      progress,
      payload: answers,
      uploaded: uploadLog,
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateCompany(appContext.workspaceId, companyId, {
        aiContextCompiled: JSON.stringify(payload),
        completionScore: Math.max(progress, 10),
      });
      setStatus('Progress saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed');
    }
  }

  return (
    <section className="panel">
      <div className="wizard-top">
        <div>
          <h3>{step.title}</h3>
          <p className="text-sm text-[var(--muted)]">{step.intent}</p>
        </div>
        <span className="badge">{progress}% complete</span>
      </div>

      <div className="wizard-steps">
        {STEPS.map((s, idx) => (
          <button key={s.key} type="button" className={`wizard-step ${idx === stepIndex ? 'active' : ''}`} onClick={() => setStepIndex(idx)}>
            <span>{idx + 1}</span>
            <p>{s.title}</p>
          </button>
        ))}
      </div>

      <div className="form-grid">
        {step.questions.map((question, idx) => {
          const key = promptKeys[idx];
          return (
            <label key={key}>
              <span>{question}</span>
              <textarea
                value={answers[key] || ''}
                onChange={(event) => setAnswers((prev) => ({ ...prev, [key]: event.target.value }))}
                placeholder="Paste optimized business context, prompts, references, and constraints..."
              />
            </label>
          );
        })}

        {shouldShowUploadZone ? (
          <label
            className={`upload-zone ${dragging ? 'upload-zone-active' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void onUpload(event.dataTransfer.files);
            }}
          >
            <span>Drop image/logo/reference files here</span>
            <div>Use this for visual references, logos, mood boards, and style guides.</div>
            <div className="button-row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={(event) => {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Browse files'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(event) => event.target.files && void onUpload(event.target.files)}
            />
          </label>
        ) : null}

        {uploadLog.length ? (
          <div className="panel">
            <h3>Uploaded Assets</h3>
            <ul className="list-disc pl-5 text-sm text-[var(--muted)]">
              {uploadLog.slice(0, 8).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="button-row">
        <button className="btn-ghost" type="button" onClick={() => setStepIndex((v) => Math.max(v - 1, 0))}>Back</button>
        <button className="btn-ghost" type="button" onClick={() => void saveProgress()}>Save Progress</button>
        <button className="btn-primary" type="button" onClick={() => setStepIndex((v) => Math.min(v + 1, STEPS.length - 1))}>Next</button>
      </div>

      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </section>
  );
}
