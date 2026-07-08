const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBulkPaymentRows, validateBulkPaymentSelection, filterBulkPaymentEligibleMembers } = require('../bulk-payment-utils');

test('buildBulkPaymentRows creates one payment per selected member', () => {
  const members = [
    { id: 'm1', full_name: 'Ada', email: 'ada@example.com' },
    { id: 'm2', full_name: 'Grace', email: 'grace@example.com' }
  ];

  const rows = buildBulkPaymentRows(members, {
    selectedIds: ['m1', 'm2'],
    amount: '200',
    month: 'Jul 2026',
    paymentDate: '2026-07-08',
    paymentType: 'saving',
    payoutStatus: 'accumulating',
    status: 'paid',
    reference: 'TX123',
    addedBy: 'treasury'
  });

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    member_id: 'm1',
    member_name: 'Ada',
    amount: 200,
    month: 'Jul 2026',
    payment_date: '2026-07-08',
    status: 'paid',
    payment_type: 'saving',
    payout_status: 'accumulating',
    reference: 'TX123',
    added_by: 'treasury'
  });
});

test('validateBulkPaymentSelection rejects empty selection or missing amount', () => {
  const errors = validateBulkPaymentSelection({
    selectedIds: [],
    amount: '',
    month: 'Jul 2026',
    paymentDate: '2026-07-08'
  });

  assert.deepEqual(errors, ['Select at least one member.', 'Enter a payment amount.']);
});

test('filterBulkPaymentEligibleMembers excludes admin and treasury roles', () => {
  const members = [
    { id: 'm1', full_name: 'Ada', role: 'member' },
    { id: 'm2', full_name: 'Grace', role: 'admin' },
    { id: 'm3', full_name: 'Jane', role: 'treasury' },
    { id: 'm4', full_name: 'Noah', role: 'member' }
  ];

  const filtered = filterBulkPaymentEligibleMembers(members);

  assert.deepEqual(filtered.map((member) => member.id), ['m1', 'm4']);
});
