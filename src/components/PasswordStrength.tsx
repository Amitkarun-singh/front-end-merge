interface PasswordStrengthProps {
  password: string;
}

interface Criteria {
  met: boolean;
  label: string;
}

function getCriteria(pw: string): Criteria[] {
  return [
    { met: pw.length >= 8,        label: '8+ characters' },
    { met: /[A-Z]/.test(pw),      label: 'Uppercase' },
    { met: /[a-z]/.test(pw),      label: 'Lowercase' },
    { met: /[0-9!@#$%^&*]/.test(pw), label: 'Number / Symbol' },
  ];
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const criteria = getCriteria(password);
  const score = criteria.filter(c => c.met).length;

  let label = 'Weak';
  let color = '#EF4444';

  if (score >= 3) { label = 'Strong'; color = '#10B981'; }
  else if (score === 2) { label = 'Fair'; color = '#F59E0B'; }

  const segColors = criteria.map((c, i) => {
    if (i < score) return color;
    return '#E2E8F0';
  });

  return (
    <div className="reg-strength-wrap">
      <div className="reg-strength-bars">
        {segColors.map((c, i) => (
          <div
            key={i}
            className="reg-strength-seg"
            style={{ background: c, transition: 'background 0.3s' }}
          />
        ))}
      </div>
      <div className="reg-strength-label" style={{ color }}>
        {label}
      </div>
    </div>
  );
}
