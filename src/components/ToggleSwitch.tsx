interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  id?: string;
  label?: string;
}

export default function ToggleSwitch({ checked, onChange, id = 'toggle', label }: ToggleSwitchProps) {
  return (
    <label className="reg-toggle-label" htmlFor={id}>
      <div
        className={`reg-toggle${checked ? ' reg-toggle-on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        id={id}
        tabIndex={0}
        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onChange(!checked); }}
      >
        <div className="reg-toggle-thumb" />
      </div>
      {label && <span className="reg-toggle-text">{label}</span>}
    </label>
  );
}
