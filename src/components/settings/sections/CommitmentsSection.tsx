import React, { useState } from 'react';
import { RecurringCommitment } from '../../../domain/models/Deductions';
import { Building, Plus, Trash2 } from 'lucide-react';

interface CommitmentsSectionProps {
  commitments: RecurringCommitment[];
  onAddCommitment: (commitment: Omit<RecurringCommitment, 'id'>) => void;
  onRemoveCommitment: (id: string) => void;
}

export const CommitmentsSection: React.FC<CommitmentsSectionProps> = ({
  commitments,
  onAddCommitment,
  onRemoveCommitment,
}) => {
  const [newCommitmentName, setNewCommitmentName] = useState('');
  const [newCommitmentAmount, setNewCommitmentAmount] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitmentName || !newCommitmentAmount) return;
    onAddCommitment({
      name: newCommitmentName,
      amount: parseFloat(newCommitmentAmount) || 0,
    });
    setNewCommitmentName('');
    setNewCommitmentAmount('');
  };

  return (
    <div>
      <div className="settings-section-title">
        <Building size={16} style={{ display: 'inline', marginRight: '6px' }} />
        Recurring Commitments & Voluntary Deductions
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {commitments.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0.75rem',
              background: 'var(--bg-card-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
            }}
          >
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</span>
              <span
                style={{
                  marginLeft: '0.5rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.8125rem',
                }}
              >
                (Monthly)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="tabular-nums font-bold" style={{ color: 'var(--rose)' }}>
                -£{item.amount.toFixed(2)}
              </span>
              <button
                type="button"
                className="nav-arrow-btn"
                style={{ color: 'var(--rose)', width: '28px', height: '28px' }}
                onClick={() => onRemoveCommitment(item.id)}
                title="Remove commitment"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Add New Commitment Form */}
        <form
          onSubmit={handleAddSubmit}
          style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Unison Union Fee"
            style={{ flex: 1.5 }}
            value={newCommitmentName}
            onChange={(e) => setNewCommitmentName(e.target.value)}
          />
          <input
            type="number"
            step="0.01"
            className="form-input"
            placeholder="£ Amount"
            style={{ flex: 1 }}
            value={newCommitmentAmount}
            onChange={(e) => setNewCommitmentAmount(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-secondary"
            style={{ padding: '0.55rem 0.85rem' }}
            title="Add commitment"
          >
            <Plus size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
