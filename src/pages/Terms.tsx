import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { ShieldIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

const EFFECTIVE_DATE = 'May 19, 2026'
const APP_NAME       = 'YouXP'
const CONTACT_EMAIL  = 'benthejamsimmons@gmail.com'

function Section({ num, title, children }: { num?: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginBottom: 16, borderRadius: 14,
      background: 'var(--surface-1)', border: '1px solid var(--border-default)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
      }}>
        {num && (
          <span style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: 'var(--base-bg)',
          }}>{num}</span>
        )}
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

export function Terms() {
  usePageTitle('Terms of Service')
  const navigate = useNavigate()

  return (
    <>
      <TopBar title="Terms of Service" back />
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
              Terms of Service
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {APP_NAME} · Effective {EFFECTIVE_DATE}
            </p>
          </div>
        </div>

        <Section num="1" title="Acceptance">
          <p>
            By creating an account and using {APP_NAME}, you agree to these Terms of Service.
            If you do not agree, please do not use the app. These terms may be updated from time to time;
            continued use after changes constitutes acceptance of the revised terms.
          </p>
        </Section>

        <Section num="2" title="Who Can Use YouXP">
          <p>
            {APP_NAME} is intended for personal, non-commercial use. You must be at least 13 years old
            to create an account. By using the app you confirm you meet this requirement.
          </p>
        </Section>

        <Section num="3" title="Your Account">
          <p>
            You are responsible for keeping your login credentials secure. You are responsible for all
            activity that occurs under your account. Please notify us immediately if you believe your
            account has been compromised.
          </p>
        </Section>

        <Section num="4" title="Your Data">
          <p>
            All workout logs, sleep entries, scores, and other content you enter belong to you. We do not
            sell, share, or monetize your personal data. See our{' '}
            <button
              onClick={() => navigate('/privacy')}
              style={{ color: 'var(--accent)', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
            >
              Privacy Policy
            </button>{' '}
            for full details on how data is stored and handled.
          </p>
        </Section>

        <Section num="5" title="Leaderboard & Public Features">
          <p>
            {APP_NAME} offers an opt-in global leaderboard. If you choose to participate:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Your chosen display name and total XP will be visible to other authenticated users</li>
            <li>Your display name must not impersonate others or contain offensive language</li>
            <li>You can opt out and remove your profile from the leaderboard at any time</li>
            <li>Your leaderboard entry is permanently deleted when you delete your account</li>
          </ul>
        </Section>

        <Section num="6" title="Acceptable Use">
          <p>You agree not to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Attempt to access another user's account or data</li>
            <li>Reverse-engineer, scrape, or otherwise misuse the app or its backend</li>
            <li>Use the app for any unlawful purpose</li>
            <li>Upload malicious code or interfere with the service</li>
            <li>Use offensive, impersonating, or misleading display names on public-facing features</li>
          </ul>
        </Section>

        <Section num="7" title="Health Disclaimer">
          <p>
            {APP_NAME} is a personal tracking tool, not a medical or fitness professional. Nothing in
            the app constitutes medical advice. Always consult a qualified health professional before
            starting or changing an exercise or diet program.
          </p>
        </Section>

        <Section num="8" title="Availability & Changes">
          <p>
            We aim to keep {APP_NAME} running reliably but cannot guarantee uninterrupted access.
            Features may be added, changed, or removed at any time. We'll try to communicate significant
            changes in advance.
          </p>
        </Section>

        <Section num="9" title="Termination">
          <p>
            You may delete your account at any time from Settings → Data &amp; Account. We reserve the
            right to suspend accounts that violate these terms.
          </p>
        </Section>

        <Section num="10" title="Limitation of Liability">
          <p>
            {APP_NAME} is provided "as is" without warranties of any kind. To the fullest extent
            permitted by law, we are not liable for any indirect, incidental, or consequential damages
            arising from your use of the app.
          </p>
        </Section>

        <Section num="11" title="Contact">
          <p>
            Questions about these terms? Email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

      </PageWrapper>
    </>
  )
}
