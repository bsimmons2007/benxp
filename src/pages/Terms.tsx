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

export function Terms() {
  usePageTitle('Terms of Service')
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
          Terms of Service
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 28 }}>
          Effective {EFFECTIVE_DATE}
        </p>

        <Section title="1. Acceptance">
          <p>
            By creating an account and using {APP_NAME}, you agree to these Terms of Service.
            If you do not agree, please do not use the app. These terms may be updated from time to time;
            continued use after changes constitutes acceptance of the revised terms.
          </p>
        </Section>

        <Section title="2. Who Can Use YouXP">
          <p>
            {APP_NAME} is intended for personal, non-commercial use. You must be at least 13 years old
            to create an account. By using the app you confirm you meet this requirement.
          </p>
        </Section>

        <Section title="3. Your Account">
          <p>
            You are responsible for keeping your login credentials secure. You are responsible for all
            activity that occurs under your account. Please notify us immediately if you believe your
            account has been compromised.
          </p>
        </Section>

        <Section title="4. Your Data">
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

        <Section title="5. Acceptable Use">
          <p>You agree not to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Attempt to access another user's account or data</li>
            <li>Reverse-engineer, scrape, or otherwise misuse the app or its backend</li>
            <li>Use the app for any unlawful purpose</li>
            <li>Upload malicious code or interfere with the service</li>
          </ul>
        </Section>

        <Section title="6. Health Disclaimer">
          <p>
            {APP_NAME} is a personal tracking tool, not a medical or fitness professional. Nothing in
            the app constitutes medical advice. Always consult a qualified health professional before
            starting or changing an exercise or diet program.
          </p>
        </Section>

        <Section title="7. Availability & Changes">
          <p>
            We aim to keep {APP_NAME} running reliably but cannot guarantee uninterrupted access.
            Features may be added, changed, or removed at any time. We'll try to communicate significant
            changes in advance.
          </p>
        </Section>

        <Section title="8. Termination">
          <p>
            You may delete your account at any time from Settings → Data &amp; Account. We reserve the
            right to suspend accounts that violate these terms.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            {APP_NAME} is provided "as is" without warranties of any kind. To the fullest extent
            permitted by law, we are not liable for any indirect, incidental, or consequential damages
            arising from your use of the app.
          </p>
        </Section>

        <Section title="10. Contact">
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
