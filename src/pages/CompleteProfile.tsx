import { useState, useEffect, useCallback, useMemo } from 'react';
import './Register.css';
import './StudentLoginPage.css';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { useRegistration, handleResponseError, RegistrationError } from '@/context/RegistrationContext';
import ToggleSwitch from '@/components/ToggleSwitch';
import schools2aiIcon from '@/assets/schools2ai-icon.png';
import { config } from '../../app.config.js';
import { getSections, getStreams } from '@/api/curriculum';

const API_BASE = config.server;

interface OnboardingData {
  classes: Array<{ class_id: number; class_name: string }>;
  subjects: Array<{ subject_id: number; subject_name: string; class_name?: string }>;
  boards: string[];
  languages: string[];
  schoolDefaults?: {
    school_name?: string;
    address?: string;
    state?: string;
    district?: string;
    board?: string;
    language_preference?: string;
  };
}

interface Toast {
  type: 'error' | 'warning' | 'success';
  message: string;
}

function SkeletonSelect() {
  return <div className="reg-skeleton" />;
}

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { role, accessToken, full_name, board: contextBoard, clearRegistration, setRegistrationData } = useRegistration();

  // Guard: redirect if no accessToken
  useEffect(() => {
    if (!accessToken) navigate('/register', { replace: true });
  }, [accessToken, navigate]);

  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Student fields
  const [classId, setClassId] = useState('');
  const [language, setLanguage] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  // Student curriculum fields (section & stream)
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStream,  setSelectedStream]  = useState<string | null>(null);
  const [availableSections, setAvailableSections] = useState<{ id: number; section_name: string }[]>([]);
  const [availableStreams,  setAvailableStreams]  = useState<{ id: number; stream_name: string }[]>([]);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [curriculumError,   setCurriculumError]  = useState('');

  // Derived: grade number from selected class
  const gradeNumber = useMemo(() => {
    if (!classId || !onboarding) return null;
    const cls = onboarding.classes.find(c => String(c.class_id) === classId);
    if (!cls) return null;
    const match = cls.class_name.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }, [classId, onboarding]);

  const showStream = role === 'STUDENT' && gradeNumber !== null && gradeNumber >= 11;

  // Teacher fields
  const [teacherClass, setTeacherClass] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [experience, setExperience] = useState('');
  const [age, setAge] = useState('');
  const [deviceType, setDeviceType] = useState('');

  const showToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 5000);
  };

  const fetchOnboarding = useCallback(async () => {
    if (!accessToken) return;
    setOnboardingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register/onboarding`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        await handleResponseError(res, "Failed to load onboarding options");
      }
      const data = await res.json().catch(() => ({}));
      const od = data.data ?? data;
      setOnboarding(od);
      // Pre-fill language from school defaults if present
      if (od.schoolDefaults?.language_preference) setLanguage(od.schoolDefaults.language_preference);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load options. Using defaults.';
      showToast({ type: 'error', message });
      setOnboarding({
        classes: [],
        subjects: [],
        boards: ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge'],
        languages: ['English', 'Hindi', 'Tamil', 'Telugu', 'Marathi'],
      });
    } finally {
      setOnboardingLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchOnboarding(); }, [fetchOnboarding]);

  // Fetch sections & streams from curriculum service (STUDENT only, once per token)
  const fetchCurriculum = useCallback(async () => {
    if (!accessToken || role !== 'STUDENT') return;
    setCurriculumLoading(true);
    setCurriculumError('');
    try {
      const [sections, streams] = await Promise.all([
        getSections(accessToken),
        getStreams(accessToken),
      ]);
      setAvailableSections(sections);
      // Filter out General stream (id === 4)
      setAvailableStreams(streams.filter(s => s.id !== 4));
    } catch {
      setCurriculumError('Could not load options. Please try again.');
    } finally {
      setCurriculumLoading(false);
    }
  }, [accessToken, role]);

  useEffect(() => { fetchCurriculum(); }, [fetchCurriculum]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const errs: Record<string, string> = {};
    if (role === 'STUDENT') {
      if (!classId) errs.classId = 'Please select your class';
      if (!selectedSection) errs.section = 'Please select your section';
      if (showStream && !selectedStream) errs.stream = 'Please select your stream';
      // Block submit if curriculum options failed to load
      if (curriculumError) errs.section = 'Please load section options before submitting';
    } else if (role === 'TEACHER') {
      if (!subjectId) errs.subjectId = 'Please select your primary subject';
    }
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});

    setLoading(true);
    setInlineError('');

    try {
      // Board: use what was selected on Screen 1, else school default, else first in list
      const boardList = onboarding?.boards ?? ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge'];
      const resolvedBoard = contextBoard || onboarding?.schoolDefaults?.board || boardList[0];

      let body: Record<string, unknown>;
      if (role === 'STUDENT') {
        body = {
          class_id: classId ? Number(classId) : undefined,
          board: resolvedBoard,
          preferred_language: language,
          dob: dob || undefined,
          gender: gender ? gender.toLowerCase() : undefined,
          analytics_enabled: analyticsEnabled,
          // ── New curriculum fields ────────────────────────────────────
          section_name: selectedSection,
          stream: gradeNumber !== null && gradeNumber >= 11 ? selectedStream : null,
        };
        // Also persist to registration context so VerifyOtp carries them forward
        setRegistrationData({ section_name: selectedSection, stream: gradeNumber !== null && gradeNumber >= 11 ? selectedStream : null });
      } else {
        body = {
          primary_subject_id: subjectId ? Number(subjectId) : undefined,
          board: resolvedBoard,
          preferred_language: language,
          experience: experience ? Number(experience) : undefined,
          age: age ? Number(age) : undefined,
          device_type: deviceType || undefined,
        };
      }

      const res = await fetch(`${API_BASE}/api/v1/auth/register/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        await handleResponseError(res, "Profile save failed");
      }

      // Show success overlay
      setShowSuccess(true);

      // Countdown then redirect to login
      let c = 5;
      setCountdown(c);
      const iv = setInterval(() => {
        c -= 1;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(iv);
          clearRegistration();
          navigate('/login', { replace: true });
        }
      }, 1000);
    } catch (err: unknown) {
      let message = 'Connection error. Please try again.';
      if (err instanceof RegistrationError) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setInlineError(message);
      showToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    clearRegistration();
    navigate('/login', { replace: true });
  };

  const languages = onboarding?.languages ?? ['English', 'Hindi', 'Tamil', 'Telugu'];

  if (showSuccess) {
    return (
      <div className="login-page">
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-2" />
        <div className="login-blob login-blob-3" />
        <div className="reg-centered" style={{ maxWidth: 460 }}>
          <div className="login-card" style={{ borderRadius: '1.5rem' }}>
            <div className="reg-success-wrap">
              <div className="reg-success-check">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="reg-success-title">Account Created! 🎉</h2>
              <p className="reg-success-sub">
                Welcome,{' '}
                <strong>{full_name || (role === 'STUDENT' ? 'Student' : 'Teacher')}!</strong>
                <br />
                Your account is ready. You can now{' '}
                <strong>sign in with your credentials</strong>{' '}to start using Schools2AI.
              </p>

              {/* Credentials reminder box */}
              <div style={{
                width: '100%', maxWidth: 300,
                background: 'hsl(262 60% 97%)',
                border: '1px solid hsl(262 60% 88%)',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                textAlign: 'left',
              }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(262 83% 50%)', margin: '0 0 0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your login details
                </p>
                <p style={{ fontSize: '0.85rem', color: 'hsl(240 10% 20%)', margin: 0, lineHeight: 1.8 }}>
                  🔑 Use your <strong>username</strong> &amp; <strong>password</strong> to sign in.
                </p>
              </div>

              <button
                type="button"
                className="reg-submit-btn"
                style={{ maxWidth: 280, marginTop: '0.75rem' }}
                onClick={handleGoToLogin}
              >
                Go to Login <ArrowRight size={18} />
              </button>

              {/* Countdown progress bar */}
              <div style={{ width: '100%', maxWidth: 280, marginTop: '0.5rem' }}>
                <div style={{
                  height: 4, borderRadius: 2, background: 'hsl(240 6% 90%)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${((5 - countdown) / 5) * 100}%`,
                    background: 'linear-gradient(90deg, hsl(262 83% 58%), hsl(187 96% 42%))',
                    transition: 'width 1s linear',
                    borderRadius: 2,
                  }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'hsl(240 4% 60%)', marginTop: '0.375rem', textAlign: 'center' }}>
                  Redirecting to login in {countdown}s…
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      {/* Toast */}
      {toast && (
        <div className={`reg-toast reg-toast-${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}

      <div className="reg-centered reg-centered-wide">
        {/* Progress bar — 3 segments all filled (step 3 of 3) */}
        <div className="reg-progress-bar">
          <div className="reg-progress-seg" />
          <div className="reg-progress-seg" />
          <div className="reg-progress-seg" />
        </div>
        <p className="reg-step-label">Step 3 of 3 — Complete your profile</p>

        <div className="login-card" style={{ borderRadius: '0 0 1.5rem 1.5rem' }}>
          {/* Header with school badge */}
          <div className="login-header" style={{ position: 'relative' }}>
            <div className="login-logo">
              <img src={schools2aiIcon} alt="Schools2AI" className="login-logo-img" />
              <h1 className="login-logo-text">Schools<span>2AI</span></h1>
            </div>
            <p className="login-subtitle">Almost done!</p>
            <p className="login-description">Tell us a bit more about yourself</p>
            {/* School badge */}
            {onboarding?.schoolDefaults?.school_name && (
              <span style={{
                position: 'absolute', top: 0, right: 0,
                background: '#EEF2FF', border: '1px solid #C7D2FE',
                borderRadius: '999px', padding: '0.25rem 0.625rem',
                fontSize: '0.72rem', fontWeight: 700,
                color: 'hsl(262 83% 48%)', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                🏫 {onboarding.schoolDefaults.school_name}
                {onboarding.schoolDefaults.board && ` · ${onboarding.schoolDefaults.board}`}
              </span>
            )}
          </div>

          {/* School info banner (if linked) */}
          {onboarding?.schoolDefaults?.school_name && (
            <div className="sl-profile-banner" aria-label="Linked school">
              <p className="sl-profile-banner-label">Your school</p>
              <p className="sl-profile-banner-name">{onboarding.schoolDefaults.school_name}</p>
              {onboarding.schoolDefaults.address && (
                <p className="sl-profile-banner-address">{onboarding.schoolDefaults.address}</p>
              )}
              {onboarding.schoolDefaults.board && (
                <span className="school-tag school-tag-board" style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                  {onboarding.schoolDefaults.board}
                </span>
              )}
            </div>
          )}

          {/* Inline error */}
          {inlineError && (
            <div className="reg-error-banner" role="alert" style={{ marginBottom: '1rem' }}>
              ⚠ {inlineError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="reg-form">

            {/* ── STUDENT FIELDS ── */}
            {role === 'STUDENT' && (
              <>
                {/* Class */}
                <div className="reg-field">
                  <label htmlFor="reg-class" className="reg-label">Select your class</label>
                  {onboardingLoading ? <SkeletonSelect /> : (
                    <select
                      id="reg-class"
                      value={classId}
                      onChange={e => {
                        const newId = e.target.value;
                        setClassId(newId);
                        setFieldErrors(p => ({ ...p, classId: '' }));
                        // Find new grade number to clear stream if needed
                        const cls = onboarding?.classes.find(c => String(c.class_id) === newId);
                        const m = cls?.class_name.match(/(\d+)/);
                        const newGrade = m ? parseInt(m[1], 10) : null;
                        if (newGrade === null || newGrade < 11) {
                          setSelectedStream(null);
                          setFieldErrors(p => ({ ...p, stream: '' }));
                        }
                      }}
                      className={`reg-input reg-input-no-icon reg-input-select${fieldErrors.classId ? ' reg-input-error' : ''}`}
                    >
                      <option value="">Which class are you in?</option>
                      {onboarding?.classes.map(c => (
                        <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                      ))}
                    </select>
                  )}
                  {fieldErrors.classId && <span className="reg-field-error" role="alert">⚠ {fieldErrors.classId}</span>}
                </div>

                {/* Section — always shown for STUDENT, fetched from curriculum API */}
                <div className="reg-field">
                  <label htmlFor="reg-section" className="reg-label">
                    Section <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  {curriculumError ? (
                    <div className="reg-curriculum-error" role="alert">
                      <span>⚠ {curriculumError}</span>
                      <button
                        type="button"
                        className="reg-curriculum-retry"
                        onClick={fetchCurriculum}
                      >
                        <RefreshCw size={13} style={{ display: 'inline', marginRight: 4 }} />
                        Retry
                      </button>
                    </div>
                  ) : curriculumLoading ? <SkeletonSelect /> : (
                    <select
                      id="reg-section"
                      value={selectedSection}
                      onChange={e => { setSelectedSection(e.target.value); setFieldErrors(p => ({ ...p, section: '' })); }}
                      className={`reg-input reg-input-no-icon reg-input-select${fieldErrors.section ? ' reg-input-error' : ''}`}
                      disabled={curriculumLoading}
                    >
                      <option value="">Which section are you in?</option>
                      {availableSections.map(s => (
                        <option key={s.id} value={s.section_name}>{s.section_name}</option>
                      ))}
                    </select>
                  )}
                  {fieldErrors.section && <span className="reg-field-error" role="alert">⚠ {fieldErrors.section}</span>}
                </div>

                {/* Stream — STUDENT only, shown only when grade ≥ 11 */}
                <div
                  className={`reg-stream-anim${showStream ? ' reg-stream-anim--visible' : ''}`}
                  aria-hidden={!showStream}
                >
                  <div className="reg-field">
                    <label htmlFor="reg-stream" className="reg-label">
                      Stream <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    {curriculumLoading ? <SkeletonSelect /> : (
                      <select
                        id="reg-stream"
                        value={selectedStream ?? ''}
                        onChange={e => { setSelectedStream(e.target.value || null); setFieldErrors(p => ({ ...p, stream: '' })); }}
                        className={`reg-input reg-input-no-icon reg-input-select${fieldErrors.stream ? ' reg-input-error' : ''}`}
                        disabled={curriculumLoading || !showStream}
                        tabIndex={showStream ? 0 : -1}
                      >
                        <option value="">Which stream are you in?</option>
                        {availableStreams.map(s => (
                          <option key={s.id} value={s.stream_name}>{s.stream_name}</option>
                        ))}
                      </select>
                    )}
                    {fieldErrors.stream && <span className="reg-field-error" role="alert">⚠ {fieldErrors.stream}</span>}
                  </div>
                </div>

                {/* Language */}
                <div className="reg-field">
                  <label htmlFor="reg-lang" className="reg-label">Preferred Language</label>
                  {onboardingLoading ? <SkeletonSelect /> : (
                    <select
                      id="reg-lang"
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="reg-input reg-input-no-icon reg-input-select"
                    >
                      <option value="">Select language</option>
                      {languages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="reg-field">
                  <label htmlFor="reg-dob" className="reg-label">Date of Birth</label>
                  <input
                    id="reg-dob"
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="reg-input reg-input-no-icon"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Gender */}
                <div className="reg-field">
                  <label className="reg-label">Gender</label>
                  <div className="reg-radio-group" role="group">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button
                        key={g}
                        type="button"
                        className={`reg-radio-pill${gender === g ? ' reg-radio-pill-active' : ''}`}
                        onClick={() => setGender(g)}
                        aria-pressed={gender === g}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Analytics toggle */}
                <div className="reg-field">
                  <label className="reg-label">AI Analytics</label>
                  <ToggleSwitch
                    checked={analyticsEnabled}
                    onChange={setAnalyticsEnabled}
                    id="reg-analytics"
                    label="Help improve my AI experience"
                  />
                </div>
              </>
            )}

            {/* ── TEACHER FIELDS ── */}
            {role === 'TEACHER' && (
              <>
                {/* Primary Subject — adaptive: class-aware if class_name available, else unique list */}
                <div className="reg-field">
                  <label className="reg-label">
                    Primary Subject <span style={{ color: '#EF4444' }}>*</span>
                  </label>

                  {onboardingLoading ? (
                    <><SkeletonSelect /><SkeletonSelect /></>
                  ) : (() => {
                    const allSubjects = onboarding?.subjects ?? [];

                    // ── Check if any subject has class_name data ──────────────
                    const hasClassInfo = allSubjects.some(s => s.class_name);

                    if (hasClassInfo) {
                      // ── TWO-STEP MODE: Class pill → filtered subject dropdown ──
                      const classNames = Array.from(
                        new Set(allSubjects.map(s => s.class_name).filter(Boolean))
                      ).sort((a, b) => {
                        const numA = parseInt(a ?? '', 10);
                        const numB = parseInt(b ?? '', 10);
                        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                        return (a ?? '').localeCompare(b ?? '');
                      });

                      const filteredSubjects = teacherClass
                        ? allSubjects.filter(s => s.class_name === teacherClass)
                        : [];

                      // De-duplicate by subject_name within selected class
                      const uniqueSubjects = filteredSubjects.filter(
                        (s, i, arr) => arr.findIndex(x => x.subject_name === s.subject_name) === i
                      );

                      return (
                        <>
                          {/* Step 1: pick a class */}
                          <div style={{ marginBottom: '0.625rem' }}>
                            <p style={{
                              fontSize: '0.78rem', color: 'hsl(240 4% 50%)',
                              marginBottom: '0.5rem', fontWeight: 500,
                            }}>
                              Step 1 — Select class you teach
                            </p>
                            <div className="reg-class-pill-grid">
                              {classNames.map(cn => (
                                <button
                                  key={cn}
                                  type="button"
                                  className={`reg-class-pill${teacherClass === cn ? ' reg-class-pill-active' : ''}`}
                                  onClick={() => {
                                    setTeacherClass(cn ?? '');
                                    setSubjectId('');
                                    setFieldErrors(p => ({ ...p, subjectId: '' }));
                                  }}
                                  aria-pressed={teacherClass === cn}
                                >
                                  {cn}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Step 2: pick subject */}
                          {teacherClass ? (
                            <div>
                              <p style={{
                                fontSize: '0.78rem', color: 'hsl(240 4% 50%)',
                                marginBottom: '0.5rem', fontWeight: 500,
                              }}>
                                Step 2 — Your subject for <strong>{teacherClass}</strong>
                              </p>
                              <select
                                id="reg-subject"
                                value={subjectId}
                                onChange={e => { setSubjectId(e.target.value); setFieldErrors(p => ({ ...p, subjectId: '' })); }}
                                className={`reg-input reg-input-no-icon reg-input-select${fieldErrors.subjectId ? ' reg-input-error' : ''}`}
                              >
                                <option value="">Choose a subject…</option>
                                {uniqueSubjects.map(s => (
                                  <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <p style={{ fontSize: '0.78rem', color: 'hsl(240 4% 55%)', margin: '0.25rem 0 0' }}>
                              ← Pick a class above to see subjects
                            </p>
                          )}
                        </>
                      );
                    }

                    // ── SIMPLE MODE: unique subjects, no class info ────────────
                    const uniqueAll = allSubjects.filter(
                      (s, i, arr) => arr.findIndex(x => x.subject_name === s.subject_name) === i
                    ).sort((a, b) => a.subject_name.localeCompare(b.subject_name));

                    return (
                      <select
                        id="reg-subject"
                        value={subjectId}
                        onChange={e => { setSubjectId(e.target.value); setFieldErrors(p => ({ ...p, subjectId: '' })); }}
                        className={`reg-input reg-input-no-icon reg-input-select${fieldErrors.subjectId ? ' reg-input-error' : ''}`}
                      >
                        <option value="">Select your primary subject</option>
                        {uniqueAll.map(s => (
                          <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                        ))}
                      </select>
                    );
                  })()}

                  {fieldErrors.subjectId && (
                    <span className="reg-field-error" role="alert">⚠ {fieldErrors.subjectId}</span>
                  )}
                </div>

                {/* Language */}
                <div className="reg-field">
                  <label htmlFor="reg-lang-t" className="reg-label">Preferred Language</label>
                  {onboardingLoading ? <SkeletonSelect /> : (
                    <select
                      id="reg-lang-t"
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="reg-input reg-input-no-icon reg-input-select"
                    >
                      <option value="">Select language</option>
                      {languages.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  )}
                </div>

                {/* Experience */}
                <div className="reg-field">
                  <label htmlFor="reg-exp" className="reg-label">Years of Experience</label>
                  <input
                    id="reg-exp"
                    type="number"
                    value={experience}
                    onChange={e => setExperience(e.target.value)}
                    placeholder="e.g. 5"
                    min={0}
                    max={50}
                    className="reg-input reg-input-no-icon"
                  />
                </div>

                {/* Age */}
                <div className="reg-field">
                  <label htmlFor="reg-age" className="reg-label">Age</label>
                  <input
                    id="reg-age"
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 30"
                    min={18}
                    max={80}
                    className="reg-input reg-input-no-icon"
                  />
                </div>

                {/* Device Type */}
                <div className="reg-field">
                  <label className="reg-label">Primary Device</label>
                  <div className="reg-radio-group" role="group">
                    {['Mobile', 'Tablet', 'Desktop'].map(d => (
                      <button
                        key={d}
                        type="button"
                        className={`reg-radio-pill${deviceType === d ? ' reg-radio-pill-active' : ''}`}
                        onClick={() => setDeviceType(d)}
                        aria-pressed={deviceType === d}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="reg-submit-btn"
              id="btn-complete-setup"
              style={{ marginTop: '0.5rem' }}
            >
              {loading
                ? <><div className="reg-spinner" /><span>Saving…</span></>
                : <><span>Complete Setup</span><ArrowRight size={18} /></>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
