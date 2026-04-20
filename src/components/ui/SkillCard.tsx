import { ProgressBar } from './ProgressBar'
import { SKILL_DEFS } from '../../lib/skills'
import type { SkillState } from '../../lib/skills'

interface SkillCardProps {
  skill: SkillState
}

export function SkillCard({ skill }: SkillCardProps) {
  const def = SKILL_DEFS[skill.key]

  return (
    <div
      className="card-animate"
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 22 }}>{def.icon}</span>
          <div>
            <p className="font-bold text-white text-sm" style={{ fontFamily: 'Cinzel, serif' }}>{def.label}</p>
            <p style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {skill.title}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-2xl" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif', lineHeight: 1 }}>
            {skill.level}
          </p>
          <p style={{ color: '#555', fontSize: 9 }}>LEVEL</p>
        </div>
      </div>

      <ProgressBar value={skill.progress} height={6} glow />

      <div className="flex justify-between mt-1.5">
        <p style={{ color: '#555', fontSize: 10 }}>{skill.xp.toLocaleString()} XP</p>
        <p style={{ color: '#555', fontSize: 10 }}>{skill.nextXP.toLocaleString()} to next</p>
      </div>
    </div>
  )
}
