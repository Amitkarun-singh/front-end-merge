import { CheckCircle2 } from 'lucide-react';

interface SchoolData {
  udise_code?: string;
  school_name: string;
  block?: string;
  district?: string;
  state?: string;
  pincode?: string;
  board?: string;
}

interface SchoolConfirmCardProps {
  school: SchoolData;
  onChangeSchool: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function SchoolConfirmCard({
  school,
  onChangeSchool,
  onConfirm,
  loading = false,
}: SchoolConfirmCardProps) {
  const addressParts = [school.block, school.district, school.state].filter(Boolean).join(', ');
  const addressWithPin = school.pincode ? `${addressParts} — ${school.pincode}` : addressParts;

  return (
    <div className="school-confirm-card" role="region" aria-label="Confirm school selection">
      <div className="school-confirm-header">
        <CheckCircle2 size={18} className="school-confirm-check" aria-hidden="true" />
        <span className="school-confirm-label">You selected</span>
      </div>

      <p className="school-confirm-name">{school.school_name}</p>
      {addressWithPin && (
        <p className="school-confirm-address">{addressWithPin}</p>
      )}

      <div className="school-confirm-tags">
        {school.board && (
          <span className="school-tag school-tag-board">{school.board}</span>
        )}
        {school.udise_code && (
          <span className="school-tag school-tag-udise">UDISE: {school.udise_code}</span>
        )}
      </div>

      <div className="school-confirm-actions">
        <button
          type="button"
          className="school-confirm-change-btn"
          onClick={onChangeSchool}
          disabled={loading}
        >
          Change school
        </button>
        <button
          type="button"
          className="school-confirm-proceed-btn"
          onClick={onConfirm}
          disabled={loading}
          id="btn-confirm-school"
        >
          {loading ? (
            <><div className="reg-spinner" /> Saving…</>
          ) : (
            'Confirm & Continue →'
          )}
        </button>
      </div>
    </div>
  );
}
