import type { Patient } from '../../../api';

type BasicDataSectionProps = {
  patient: Patient;
};

export default function BasicDataSection({
  patient,
}: BasicDataSectionProps) {
  return (
    <section className="detail-section" style={{ marginTop: '1.5rem' }}>
      <div className="detail-section-heading">
        <h2>Baseline Data</h2>
      </div>
      <div className="detail-grid">
        <div className="detail-field">
          <span className="detail-label">Patient</span>
          <span className="detail-value">{patient.name}, {patient.first_name}</span>
        </div>
      </div>
    </section>
  );
}
