import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { ShieldIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

const EFFECTIVE_DATE = 'May 29, 2026'
const APP_NAME       = 'YouXP'
const CONTACT_EMAIL  = 'TeamYouXP@gmail.com'

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
            fontSize: 10, fontWeight: 700, color: 'var(--base-bg)',
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
              Terms of Service
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
              {APP_NAME} · Last updated {EFFECTIVE_DATE}
            </p>
          </div>
        </div>

        {/* Preamble */}
        <div style={{
          padding: '14px 16px', borderRadius: 12, marginBottom: 20,
          background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
          fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65,
        }}>
          This is a binding legal agreement between you ("User") and the operator of {APP_NAME} ("we," "us,"
          or "our"). {APP_NAME} is a personal life-tracking application that lets users earn XP by logging
          real-world activities. Please read these terms carefully before using the service.
        </div>

        <Section num="1" title="Acceptance of Terms">
          <p>
            By creating an account or using {APP_NAME} in any way, you agree to be bound by these Terms of
            Service and our{' '}
            <button
              onClick={() => navigate('/privacy')}
              style={{ color: 'var(--accent)', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
            >
              Privacy Policy
            </button>
            , which is incorporated herein by reference. If you do not agree to these terms in their
            entirety, you must not create an account or use the service. We reserve the right to modify
            these terms at any time. Continued use of the service after changes are posted constitutes
            your acceptance of the revised terms. We will update the "Last updated" date above when
            changes are made.
          </p>
        </Section>

        <Section num="2" title="Eligibility">
          <p>
            You must be at least <strong style={{ color: 'var(--text-primary)' }}>13 years of age</strong> to
            use {APP_NAME}. By creating an account, you represent and warrant that:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>You are at least 13 years old (or the minimum digital age of consent in your country)</li>
            <li>You have the legal capacity to enter into a binding agreement</li>
            <li>Your use of the service will not violate any applicable laws or regulations</li>
            <li>You are not located in a jurisdiction where using this service is prohibited</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            {APP_NAME} is intended for personal, non-commercial use only. Use by businesses, organizations,
            or for commercial purposes requires explicit written permission.
          </p>
        </Section>

        <Section num="3" title="User Accounts">
          <p>
            When you create an account, you agree to provide accurate, current, and complete information.
            You are solely responsible for:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Maintaining the confidentiality of your login credentials</li>
            <li>All activity that occurs under your account, whether or not authorized by you</li>
            <li>Notifying us immediately at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>{' '}
              if you suspect unauthorized access to your account
            </li>
          </ul>
          <p style={{ marginTop: 8 }}>
            We reserve the right to terminate accounts that are inactive for an extended period or
            that violate these terms.
          </p>
        </Section>

        <Section num="4" title="Your Content & Data">
          <p>
            All workout logs, sleep entries, scores, measurements, and other content you enter ("Your
            Content") belong to you. You grant us a limited, non-exclusive license to store and process
            Your Content solely to provide the service to you. Specifically:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>We do not sell, license, or monetize Your Content to any third party</li>
            <li>We do not use Your Content for advertising or marketing purposes</li>
            <li>Your Content is not shared with other users except features you explicitly opt into
              (such as the leaderboard, which exposes only your display name and total XP)</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            See our{' '}
            <button
              onClick={() => navigate('/privacy')}
              style={{ color: 'var(--accent)', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}
            >
              Privacy Policy
            </button>{' '}
            for full details on data storage, retention, and your rights.
          </p>
        </Section>

        <Section num="5" title="Acceptable Use">
          <p>
            You agree to use {APP_NAME} only for lawful purposes and in compliance with these terms.
            You must not:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Attempt to access, probe, or compromise another user's account or data</li>
            <li>Reverse-engineer, decompile, disassemble, or scrape the application or its backend services</li>
            <li>Use automated scripts or bots to interact with the service</li>
            <li>Upload, transmit, or store any malicious code, viruses, or disruptive software</li>
            <li>Interfere with or disrupt the service's servers, networks, or infrastructure</li>
            <li>Use the service for any unlawful purpose or in violation of any regulations</li>
            <li>Use offensive, impersonating, or misleading display names on public-facing features</li>
            <li>Resell, sublicense, or commercially exploit the service without written permission</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Violation of these restrictions may result in immediate account suspension or termination
            without prior notice.
          </p>
        </Section>

        <Section num="6" title="Leaderboard & Public Features">
          <p>
            {APP_NAME} offers an opt-in global leaderboard. Participation is entirely voluntary.
            By opting in, you acknowledge:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Your chosen display name and total XP will be visible to other authenticated users</li>
            <li>Your display name must not impersonate others, infringe trademarks, or contain offensive content</li>
            <li>You can opt out and remove your leaderboard profile at any time from Settings</li>
            <li>Your leaderboard entry is permanently deleted when you delete your account</li>
          </ul>
        </Section>

        <Section num="7" title="Health & Fitness Disclaimer">
          <p>
            {APP_NAME} is a personal tracking tool, <strong style={{ color: 'var(--text-primary)' }}>not
            a medical device, clinical tool, or professional fitness service.</strong> Nothing in the
            application constitutes medical advice, diagnosis, treatment, or a substitute for consultation
            with a qualified health professional. Always consult a licensed physician or certified fitness
            professional before starting, modifying, or stopping any exercise, diet, or health program.
            You assume all risk associated with any physical activity you undertake.
          </p>
        </Section>

        <Section num="8" title="Intellectual Property">
          <p>
            The {APP_NAME} name, logo, visual design, code, and all content we create are owned by or
            licensed to us and are protected by applicable intellectual property laws. You may not copy,
            reproduce, distribute, or create derivative works of our proprietary materials without
            written permission. Nothing in these terms transfers any ownership interest in our
            intellectual property to you.
          </p>
        </Section>

        <Section num="9" title="Service Availability">
          <p>
            We aim to keep {APP_NAME} available and reliable but make no guarantee of uninterrupted
            access. We may temporarily suspend the service for maintenance, security updates, or
            circumstances beyond our control. Features may be added, modified, or removed at any
            time. We will make reasonable efforts to communicate significant changes in advance but
            are not obligated to do so.
          </p>
        </Section>

        <Section num="10" title="Account Termination">
          <p>
            <strong style={{ color: 'var(--text-primary)' }}>By you:</strong> You may delete your account
            at any time from Settings → Data &amp; Account. Upon deletion, your personal data and activity
            logs will be permanently removed in accordance with our Privacy Policy.
          </p>
          <p style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--text-primary)' }}>By us:</strong> We reserve the right to
            suspend or terminate your account without notice if you violate these terms, engage in
            fraudulent activity, or if we are required to do so by law. We will make reasonable efforts
            to notify you unless prohibited by law or security concerns.
          </p>
        </Section>

        <Section num="11" title="Limitation of Liability">
          <p style={{ fontSize: 12.5, lineHeight: 1.7 }}>
            TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, {APP_NAME.toUpperCase()} AND ITS
            OPERATORS ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY,
            OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE
            SERVICE, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF REVENUE, OR PERSONAL INJURY
            RESULTING FROM PHYSICAL ACTIVITY. THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE"
            WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES
            OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p style={{ marginTop: 10 }}>
            In jurisdictions that do not allow the exclusion of certain warranties or limitation of
            liability, our liability is limited to the greatest extent permitted by law.
          </p>
          <p style={{ marginTop: 8 }}>
            Our total aggregate liability to you for any claims arising from these terms or the service
            shall not exceed the greater of (a) the amount you have paid us in the 12 months prior to
            the claim, or (b) $10 USD.
          </p>
        </Section>

        <Section num="12" title="Governing Law & Disputes">
          <p>
            These terms are governed by the laws of the United States, without regard to conflict of
            law principles. Any dispute arising from or relating to these terms or the service that
            cannot be resolved informally shall be submitted to binding individual arbitration under the
            rules of the American Arbitration Association.
          </p>
          <p style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Class action waiver:</strong> You agree
            to resolve any disputes individually. You waive any right to participate in a class action
            lawsuit or class-wide arbitration.
          </p>
          <p style={{ marginTop: 8 }}>
            Before initiating arbitration, you agree to first contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>{' '}
            and make a good-faith effort to resolve the dispute informally within 30 days.
          </p>
        </Section>

        <Section num="13" title="International Users & GDPR">
          <p>
            {APP_NAME} is operated from the United States. If you access the service from outside the
            United States, you consent to the transfer and processing of your data in the United States
            and other countries where our service providers operate.
          </p>
          <p style={{ marginTop: 8 }}>
            If you are located in the European Economic Area (EEA) or United Kingdom, the General
            Data Protection Regulation (GDPR) or UK GDPR may apply to your data. Our Privacy Policy
            describes your data rights in detail, including your right to access, correct, delete,
            and port your data.
          </p>
        </Section>

        <Section num="14" title="Severability & Entire Agreement">
          <p>
            If any provision of these terms is found to be unenforceable or invalid by a court of
            competent jurisdiction, that provision will be modified to the minimum extent necessary to
            make it enforceable, and the remaining provisions will continue in full force and effect.
          </p>
          <p style={{ marginTop: 8 }}>
            These terms, together with our Privacy Policy, constitute the entire agreement between
            you and {APP_NAME} regarding the service and supersede all prior agreements,
            representations, or understandings.
          </p>
        </Section>

        <Section num="15" title="Contact Us">
          <p>
            Questions, concerns, or legal notices regarding these terms should be sent to:
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
