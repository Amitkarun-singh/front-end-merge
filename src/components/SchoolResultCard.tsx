interface SchoolResult {
  udise_code?: string;
  school_name: string;
  block?: string;
  district?: string;
  state?: string;
  pincode?: string;
  board?: string;
}

interface SchoolResultCardProps {
  school: SchoolResult;
  onSelect: (school: SchoolResult) => void;
}

export default function SchoolResultCard({ school, onSelect }: SchoolResultCardProps) {
  const addressParts = [
    school.block,
    school.district,
    school.state,
  ].filter(Boolean).join(', ');

  const addressWithPin = school.pincode ? `${addressParts} — ${school.pincode}` : addressParts;

  return (
    <div className="school-result-card" role="article">
      <div className="school-result-icon" aria-hidden="true">
        {/* Building / School SVG */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <div className="school-result-info">
        <p className="school-result-name">{school.school_name}</p>
        {addressWithPin && (
          <p className="school-result-address">{addressWithPin}</p>
        )}
        <div className="school-result-tags">
          {school.board && (
            <span className="school-tag school-tag-board">{school.board}</span>
          )}
          {school.udise_code && (
            <span className="school-tag school-tag-udise">UDISE: {school.udise_code}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="school-result-select-btn"
        onClick={() => onSelect(school)}
        aria-label={`Select ${school.school_name}`}
      >
        Select
      </button>
    </div>
  );
}
