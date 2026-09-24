'use client';

import { useState } from 'react';
import { Save, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { SiteSettings } from '@/types';
import { useFirestoreDoc } from '@/lib/firestore/hooks';
import { COLLECTIONS, SETTINGS_GENERAL_ID } from '@/lib/firestore/collections';
import { setDocById } from '@/lib/firestore/crud';
import { useAdminAuthStore } from '@/lib/store/useAdminAuthStore';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/admin/Button';
import { Card } from '@/components/admin/Card';
import { CardSkeleton } from '@/components/admin/Skeleton';
import { TextInput } from '@/components/admin/form/TextInput';
import { NumberInput } from '@/components/admin/form/NumberInput';
import { ChipsInput } from '@/components/admin/form/ChipsInput';
import { useToast } from '@/components/admin/Toast';

const DEFAULTS: SiteSettings = {
  whatsappNumber: '+923001234567',
  contactPhone: '+923001234567',
  contactEmail: 'hello@greendecor.pk',
  address: '',
  workingHours: '',
  shippingFreeThreshold: 4000,
  shippingFlatFee: 350,
  currencyLabel: 'PKR',
  deliveryCities: [],
  supportedProvinces: [],
};

export default function SettingsPage() {
  const { data, loading } = useFirestoreDoc<SiteSettings & { id: string }>(
    COLLECTIONS.settings,
    SETTINGS_GENERAL_ID
  );
  const { pushSuccess, pushError } = useToast();
  const adminUser = useAdminAuthStore((s) => s.adminUser);
  const updatePassword = useAdminAuthStore((s) => s.updatePassword);
  const [form, setForm] = useState<SiteSettings | null>(null);
  const current = form ?? (data ? { ...DEFAULTS, ...data } : DEFAULTS);
  const [saving, setSaving] = useState(false);

  const [pwEmail, setPwEmail] = useState(adminUser?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const handlePasswordChange = async () => {
    setPwError(null);
    const email = pwEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPwError('Enter a valid email address.');
      return;
    }
    if (!adminUser || email.toLowerCase() !== (adminUser.email ?? '').trim().toLowerCase()) {
      setPwError('This email does not match the signed-in account.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwBusy(true);
    const result = await updatePassword(email, newPassword);
    setPwBusy(false);
    if (result.success) {
      pushSuccess('Password updated', 'Use the new password next time you sign in.');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPwError(result.message);
    }
  };

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((f) => ({ ...(f ?? current), [key]: value }));

  const save = async () => {
    setSaving(true);
    const result = await setDocById(COLLECTIONS.settings, SETTINGS_GENERAL_ID, current);
    setSaving(false);
    if (result.error) pushError('Could not save settings', result.error);
    else {
      pushSuccess('Settings saved', 'Applied to the store immediately');
      setForm(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Settings" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Store settings"
        subtitle="Saved to Firestore and respected instantly by the storefront."
        action={
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" />
            Save settings
          </Button>
        }
      />

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Contact & WhatsApp</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="WhatsApp number"
            value={current.whatsappNumber}
            onChange={(e) => set('whatsappNumber', e.target.value)}
            placeholder="+923001234567"
            hint="Used for quote request quick-actions on the site."
          />
          <TextInput
            label="Contact phone"
            value={current.contactPhone}
            onChange={(e) => set('contactPhone', e.target.value)}
          />
          <TextInput
            label="Contact email"
            type="email"
            value={current.contactEmail}
            onChange={(e) => set('contactEmail', e.target.value)}
          />
          <TextInput
            label="Working hours"
            value={current.workingHours}
            onChange={(e) => set('workingHours', e.target.value)}
            placeholder="Monday – Saturday, 10:00 AM – 7:00 PM"
          />
          <TextInput
            label="Address"
            value={current.address}
            onChange={(e) => set('address', e.target.value)}
          />
          <TextInput
            label="Currency label"
            value={current.currencyLabel}
            onChange={(e) => set('currencyLabel', e.target.value)}
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 font-serif text-lg text-[#172b21]">Shipping & delivery</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <NumberInput
            label="Free shipping threshold (PKR)"
            prefix="PKR"
            value={current.shippingFreeThreshold ?? 0}
            onChange={(e) => set('shippingFreeThreshold', Number(e.target.value))}
          />
          <NumberInput
            label="Flat shipping fee (PKR)"
            prefix="PKR"
            value={current.shippingFlatFee ?? 0}
            onChange={(e) => set('shippingFlatFee', Number(e.target.value))}
          />
        </div>
        <div className="mt-4">
          <ChipsInput
            label="Delivery cities"
            value={current.deliveryCities ?? []}
            onChange={(v) => set('deliveryCities', v)}
          />
        </div>
        <div className="mt-4">
          <ChipsInput
            label="Supported provinces"
            value={current.supportedProvinces ?? []}
            onChange={(v) => set('supportedProvinces', v)}
          />
        </div>
      </Card>

      <Card>
        <h3 className="font-serif text-lg text-[#172b21]">Change password</h3>
        <p className="mt-1 text-sm text-[#52685a]">
          Enter the current email on the account. If it matches the signed-in account, you can set a new password.
        </p>

        {pwError ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {pwError}
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          <TextInput
            label="Current email"
            type="email"
            autoComplete="email"
            value={pwEmail}
            onChange={(e) => {
              setPwEmail(e.target.value);
              setPwError(null);
            }}
            placeholder="admin@greendecor.pk"
            hint="Must match the email you are signed in with."
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="new-password" className="block text-sm font-medium text-[#172b21]">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPwError(null);
                  }}
                  className="h-10 w-full rounded-xl border border-[#e5ece3] bg-white px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52685a] hover:text-[#172b21]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-[#172b21]">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPwError(null);
                  }}
                  className="h-10 w-full rounded-xl border border-[#e5ece3] bg-white px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#14402a]/30"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52685a] hover:text-[#172b21]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button onClick={handlePasswordChange} loading={pwBusy}>
            <KeyRound className="h-4 w-4" />
            Update password
          </Button>
        </div>
      </Card>
    </div>
  );
}