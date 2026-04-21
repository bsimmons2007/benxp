import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { usePageTitle } from '../hooks/usePageTitle'

const EFFECTIVE_DATE = 'April 21, 2026'
const APP_NAME       = 'YouXP'
const CONTACT_EMAIL  = 'benthejamsimmons@gmail.com'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', fontFamily: 'Cinzel, serif', marginBottom: 8 }}>
        {title}
      </p>
      <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  )
}

export function Privacy() {
  usePageTitle('Privacy Policy')
  const navigate = useNavigate()

  return (
    <>
      <TopBar />
      <PageWrapper>

        <button
          onClick={() => navigate(-1)}
          style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, background: 'none',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
        >
          ← Back
        </button>

        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 26, fontWeight: 900,
          color: 'var(--text-primary)', marginBottom: 4 }}>
          Privacy Policy
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 28 }}>
          Effective {EFFECTIVE_DATE}
        </p>

        <Section title="Overview">
          <p>
            {APP_NAME} is a personal life-tracking app. We take your privacy seriously. The short
            version: your data lives in your account, we don't sell it, and you can delete everything
            at any time.
          </p>
        </Section>

        <Section title="What We Collect">
          <p>We collect only what you actively enter into the app:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong style={{ color: 'var(--text-primary)' }}>Account info</strong> — your email address, used solely for authentication</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Activity data</strong> — workouts, cardio sessions, sleep logs, book logs, game stats, and any other entries you create</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Preferences</strong> — app settings, theme choices, and display name stored locally or in your account</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            We do <strong style={{ color: 'var(--text-primary)' }}>not</strong> collect location data,
            contacts, camera/microphone access, or any device identifiers.
          </p>
        </Section>

        <Section title="How We Use Your Data">
          <p>Your data is used exclusively to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Display your stats, history, and XP progress within the app</li>
            <li>Sync your data across devices via your account</li>
            <li>Generate your shareable profile card (only when you choose to share)</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            We do <strong style={{ color: 'var(--text-primary)' }}>not</strong> use your data for
            advertising, profiling, or any purpose beyond running the app for you.
          </p>
        </Section>

        <Section title="Data Storage">
          <p>
            Your data is stored securely in{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}>
              Supabase
            </a>
            , a hosted Postgres database with row-level security — meaning only your authenticated
            account can read or write your rows. Data is encrypted at rest and in transit.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>
            {APP_NAME} uses the following third-party services, limited to their stated purpose:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Supabase</strong> — database and
              authentication. Subject to{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}>
                Supabase's Privacy Policy
              </a>
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Google Fonts</strong> — font delivery
              only; no tracking
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            No analytics services, ad networks, or data brokers are used.
          </p>
        </Section>

        <Section title="Data Sharing">
          <p>
            We do not sell, rent, or share your personal data with any third party, ever.
            The only exception would be a legal requirement (e.g., a valid court order), in which
            case we would notify you to the extent permitted by law.
          </p>
        </Section>

        <Section title="Your Rights">
          <p>You have full control over your data:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong style={{ color: 'var(--text-primary)' }}>Export</strong> — download all your data as CSV from Settings → Data &amp; Account</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Delete</strong> — permanently delete your account and all associated data from Settings → Data &amp; Account</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Correct</strong> — edit any logged entry directly in the app</li>
          </ul>
        </Section>

        <Section title="Cookies & Local Storage">
          <p>
            {APP_NAME} uses browser local storage to save your preferences (theme, settings, tutorial
            state). No cross-site tracking cookies are set.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            {APP_NAME} is not directed at children under 13. We do not knowingly collect personal
            information from anyone under 13. If you believe a child has provided us data, contact us
            and we will delete it promptly.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this policy as the app evolves. We'll update the effective date at the top
            and notify you of material changes within the app.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions or concerns? Email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

      </PageWrapper>
    </>
  )
}
