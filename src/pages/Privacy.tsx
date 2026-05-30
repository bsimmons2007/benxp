import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { ShieldIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

const EFFECTIVE_DATE = 'May 29, 2026'
const APP_NAME       = 'YouXP'
const CONTACT_EMAIL  = 'benthejamsimmons@gmail.com'

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      marginBottom: 16, borderRadius: 14,
      background: 'var(--surface-1)', border: `1px solid ${accent ? 'var(--accent)' : 'var(--border-default)'}`,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
        background: accent ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : undefined,
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
          padding: '18px 20px', borderRadius: 16, marginBottom: 12,
          background: 'var(--surface-1)', border: '1px solid var(--border-default)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldIcon size={24} color="var(--base-bg)" />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Privacy Policy
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
              {APP_NAME} · Last updated {EFFECTIVE_DATE}
            </p>
          </div>
        </div>

        {/* TL;DR callout */}
        <div style={{
          padding: '14px 16px', borderRadius: 12, marginBottom: 20,
          background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
          fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65,
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>The short version:</strong> Your data lives in
          your account. We don't sell it, share it, or use it for advertising. You can delete everything
          at any time. That's it.
        </div>

        <Section title="1. Who We Are (Data Controller)">
          <p>
            {APP_NAME} is operated by an individual developer ("we," "us," "our"). For purposes of
            applicable data protection law (including GDPR), we are the data controller for personal data
            collected through the service.
          </p>
          <p style={{ marginTop: 8 }}>
            Contact:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>
          </p>
        </Section>

        <Section title="2. What We Collect">
          <p>We collect only what you actively provide:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Account info</strong> — your email address
              and display name, used solely for authentication and identity within the app
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Activity data</strong> — workouts, cardio
              sessions, sleep logs, mood scores, book logs, game stats, and any other entries you create
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Health metrics</strong> — body measurements,
              sleep hours, and weight logs you voluntarily enter. These are stored only in your account.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>App preferences</strong> — theme choices,
              settings, and display name stored locally on your device or in your account
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Leaderboard profile</strong> — if you opt
              in: your chosen display name and total XP only. Never your activity details.
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            We do <strong style={{ color: 'var(--text-primary)' }}>not</strong> collect: location data,
            contacts, camera or microphone access, device identifiers, IP addresses for tracking, or
            any biometric data beyond what you manually log.
          </p>
        </Section>

        <Section title="3. Legal Basis for Processing (GDPR)">
          <p>
            For users in the European Economic Area (EEA) or United Kingdom, we process your personal
            data on the following legal bases:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Contract performance</strong> — processing
              your account data and activity logs is necessary to provide the service you signed up for
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Legitimate interests</strong> — basic service
              security, error monitoring (Sentry), and aggregate analytics (Vercel Analytics — no personal
              data)
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Consent</strong> — optional features like
              the public leaderboard, where you explicitly opt in
            </li>
          </ul>
        </Section>

        <Section title="4. How We Use Your Data">
          <p>Your data is used exclusively to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Display your stats, history, XP progress, and achievements within the app</li>
            <li>Sync your data across your devices via your authenticated account</li>
            <li>Generate your shareable progress card (only when you explicitly choose to share)</li>
            <li>Power the opt-in global leaderboard (display name and XP only)</li>
            <li>Monitor application errors to improve stability (Sentry — PII stripped before sending)</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            We do <strong style={{ color: 'var(--text-primary)' }}>not</strong> use your data for
            advertising, behavioral profiling, or any purpose beyond operating the app for you.
          </p>
        </Section>

        <Section title="5. Data Storage & Security">
          <p>
            Your data is stored in{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}>
              Supabase
            </a>{' '}
            (hosted PostgreSQL), a SOC 2 Type II compliant provider. Security measures include:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Row-Level Security (RLS)</strong> — database
              policies ensure your authenticated account is the only one that can read or write your rows.
              No other user can access your data, even in the event of an application bug.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Encryption in transit</strong> — all
              data is transmitted over TLS 1.2+
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Encryption at rest</strong> — data is
              encrypted at rest on Supabase infrastructure
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Password security</strong> — passwords
              are hashed using bcrypt via Supabase Auth; we never store plaintext passwords
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Content Security Policy</strong> — strict
              CSP headers limit what scripts and resources the app can load
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Despite these measures, no system is 100% secure. If you discover a security issue, please
            report it to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>{' '}
            before public disclosure.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain your data for as long as your account is active. When you delete your account:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>All personal data and activity logs are permanently deleted within 30 days</li>
            <li>Leaderboard entries are removed immediately</li>
            <li>Anonymized, aggregate-only data (e.g., total number of app users) may be retained
              indefinitely as it cannot be linked back to you</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            You can request early deletion at any time by emailing{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="7. Third-Party Services">
          <p>
            {APP_NAME} uses the following third-party services, each limited to their stated purpose:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Supabase</strong> — database and
              authentication. Your data is stored on their infrastructure. Subject to{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}>Supabase's Privacy Policy</a>
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Vercel Analytics</strong> — privacy-first,
              cookieless, anonymous page-view analytics. No personal data is collected. No cross-site
              tracking. Subject to{' '}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}>Vercel's Privacy Policy</a>
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Sentry</strong> — error monitoring.
              PII is stripped before crash reports are sent. Used only to identify and fix bugs.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Google Fonts</strong> — Space Grotesk
              and JetBrains Mono typefaces are loaded from fonts.googleapis.com. Google may log your
              IP address when fonts are fetched. See{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}>Google's Privacy Policy</a>{' '}
              for details. No font request data is accessible to {APP_NAME}.
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>No advertising networks, data brokers, or analytics platforms that
            track individuals are used.</p>
        </Section>

        <Section title="8. Data Sharing">
          <p>
            We do not sell, rent, license, or share your personal data with any third party.
            The only exceptions are:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Legal requirements</strong> — if required
              by a valid court order, subpoena, or applicable law, we may be compelled to disclose
              certain data. We will notify you to the maximum extent permitted by law.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Security emergencies</strong> — to prevent
              imminent harm or investigate suspected unauthorized access to the service
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Data breach notification:</strong> In the
            event of a breach affecting your personal data, we will notify you via the email address on
            your account within 72 hours of becoming aware of the incident, and will cooperate with
            relevant supervisory authorities as required by law.
          </p>
        </Section>

        <Section title="9. Your Rights" accent>
          <p>
            You have full control over your data. The following rights are available to all users:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Access</strong> — view all your logged
              data directly in the app at any time
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Correct</strong> — edit or delete any
              logged entry directly in the app
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Export / Portability</strong> — download
              all your data as CSV from Settings → Data &amp; Account
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Delete (Right to Erasure)</strong> — permanently
              delete your account and all associated data from Settings → Data &amp; Account, or by
              contacting us
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Opt out</strong> — withdraw consent for
              optional features (e.g., leaderboard) at any time from Settings
            </li>
          </ul>

          <p style={{ marginTop: 12, fontWeight: 700, color: 'var(--text-primary)', fontSize: 12 }}>
            GDPR-specific rights (EEA / UK users)
          </p>
          <ul style={{ marginTop: 6, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Right to restriction</strong> — request
              that we limit processing of your data while a dispute is resolved
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Right to object</strong> — object to
              processing based on legitimate interests
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Right to lodge a complaint</strong> — you
              may file a complaint with your local data protection authority (e.g., the ICO in the UK
              or your EU member state's supervisory authority)
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            To exercise any right, email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>.
            We will respond within 30 days (or sooner if required by law).
          </p>
        </Section>

        <Section title="10. California Residents (CCPA)">
          <p>
            If you are a California resident, the California Consumer Privacy Act (CCPA) gives you
            additional rights:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Right to know</strong> — request disclosure
              of the categories and specific pieces of personal information we have collected about you
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Right to delete</strong> — request deletion
              of your personal information (subject to certain exceptions)
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Right to opt out of sale</strong> — we do
              not sell personal information. There is nothing to opt out of.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>Right to non-discrimination</strong> — we
              will not discriminate against you for exercising your CCPA rights
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            To submit a CCPA request, email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>{' '}
            with the subject line "CCPA Request."
          </p>
        </Section>

        <Section title="11. Cookies & Local Storage">
          <p>
            {APP_NAME} uses browser local storage to save your preferences (theme, settings, tutorial
            completion state) with keys prefixed <code style={{ fontSize: 12, background: 'var(--surface-2)',
              padding: '1px 5px', borderRadius: 4 }}>youxp-</code>. No cross-site tracking cookies are set.
            No third-party cookies are placed by {APP_NAME} itself.
          </p>
          <p style={{ marginTop: 8 }}>
            Note: Google Fonts may set a short-lived cookie for font caching purposes when fonts are
            first loaded. You can block this via browser settings without affecting app functionality.
          </p>
        </Section>

        <Section title="12. Children's Privacy (COPPA)">
          <p>
            {APP_NAME} is not directed at children under 13. We do not knowingly collect personal
            information from anyone under 13 years of age. Users must confirm they are at least 13 at
            account creation. If we discover that a user under 13 has provided personal information,
            we will delete that information promptly.
          </p>
          <p style={{ marginTop: 8 }}>
            If you believe a child under 13 has registered an account, please contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>{' '}
            and we will take immediate action.
          </p>
        </Section>

        <Section title="13. Changes to This Policy">
          <p>
            We may update this policy as the app evolves. We will update the "Last updated" date above
            and notify you of material changes via the email on your account or a notice within the app.
            Your continued use of the service after changes are posted constitutes acceptance of the
            updated policy.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>
            Privacy questions, data requests, or concerns? Reach us at:
          </p>
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 8,
            background: 'var(--surface-2)', fontSize: 13,
          }}>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{APP_NAME}</p>
            <p style={{ marginTop: 2 }}>Email:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </Section>

      </PageWrapper>
    </>
  )
}
