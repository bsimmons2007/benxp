import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { ShieldIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

const EFFECTIVE_DATE = 'May 19, 2026'
const APP_NAME       = 'YouXP'
const CONTACT_EMAIL  = 'benthejamsimmons@gmail.com'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginBottom: 16, borderRadius: 14,
      background: 'var(--surface-1)', border: '1px solid var(--border-default)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
      }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {title}
        </p>
      </div>
      <div style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  )
}

export function Privacy() {
  usePageTitle('Privacy Policy')

  return (
    <>
      <TopBar title="Privacy Policy" back />
      <PageWrapper>

        {/* Hero */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '18px 20px', borderRadius: 16, marginBottom: 20,
          background: 'var(--surface-1)', border: '1px solid var(--border-default)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldIcon size={24} color="var(--base-bg)" />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Privacy Policy
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {APP_NAME} · Effective {EFFECTIVE_DATE}
            </p>
          </div>
        </div>

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
            <li><strong style={{ color: 'var(--text-primary)' }}>Leaderboard profile</strong> — if you opt in, your chosen display name and total XP are shared on the public leaderboard. This is entirely opt-in and can be removed at any time.</li>
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
            <li>Power the opt-in global leaderboard (display name and XP only, never activity details)</li>
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
              <strong style={{ color: 'var(--text-primary)' }}>Vercel Analytics</strong> — privacy-first,
              cookieless page-view analytics used solely to understand aggregate usage. No personal data
              or cross-site tracking. Subject to{' '}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}>
                Vercel's Privacy Policy
              </a>
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Inter Variable font</strong> — bundled
              at build time; no external font CDN requests
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>No ad networks or data brokers are used.</p>
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

        <Section title="Children's Privacy (COPPA)">
          <p>
            {APP_NAME} is not directed at children under 13. Users must confirm they are 13 or older
            at account creation. We do not knowingly collect personal information from anyone under 13.
            If you believe a child has provided us data, contact us and we will delete it promptly.
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
