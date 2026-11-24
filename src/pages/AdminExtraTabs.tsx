import React, { useEffect, useState } from 'react';
import { Download, Plus, Save, Trash2 } from 'lucide-react';
import type { PricingConfig } from '../data/siteConfig';
import type { AdminCustomerRecord } from '../utils/adminStore';
import type { ExportInfo, OwnerSettings } from '../context/SiteDataContext';

const inputCls = 'w-full px-3 py-2 rounded-xl border border-[#90E0EF] bg-white text-sm text-[#03045E] focus:outline-none focus:border-[#0077B6]';
const labelCls = 'block text-xs font-bold text-[#023E8A] mb-1';
const cardCls = 'glass-card rounded-3xl p-6 sm:p-8 bg-white/95 space-y-5';
const primaryBtn = 'inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#023E8A] to-[#0077B6] text-white text-sm font-bold glossy-btn disabled:opacity-60';

// ---------------------------------------------------------------- Customers
export function CustomersTab({
  customers,
  onDelete,
}: {
  customers: AdminCustomerRecord[];
  onDelete: (id: string) => Promise<unknown>;
}) {
  return (
    <div className="glass-card rounded-3xl bg-white/95 overflow-hidden">
      {customers.length === 0 ? (
        <p className="p-12 text-center text-sm text-[#0077B6]">No customers have created an account yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#CAF0F8] text-xs font-bold text-[#0077B6] bg-[#CAF0F8]/35">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Remove</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-[#CAF0F8]/70 last:border-b-0">
                  <td className="py-3 px-4 font-bold text-[#03045E]">{c.fullName}</td>
                  <td className="py-3 px-4 text-[#03045E]">{c.email}</td>
                  <td className="py-3 px-4 tabular-nums text-[#03045E]">{c.phone || '—'}</td>
                  <td className="py-3 px-4 text-xs tabular-nums text-[#0077B6]">{c.createdAt.slice(0, 10)}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${c.fullName}`}
                      onClick={() => {
                        if (window.confirm(`Remove ${c.fullName}'s account? Their past bookings stay in the list.`)) void onDelete(c.id);
                      }}
                      className="p-2 rounded-lg border border-[#90E0EF] text-[#023E8A] hover:bg-[#ADE8F4]/60"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Pricing
export function PricingTab({
  pricing,
  onSave,
}: {
  pricing: PricingConfig;
  onSave: (next: PricingConfig) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<PricingConfig>(pricing);
  const [citiesText, setCitiesText] = useState(pricing.departureCities.join(', '));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(pricing);
    setCitiesText(pricing.departureCities.join(', '));
  }, [pricing]);

  const num = (v: string) => (v === '' ? 0 : Math.max(0, Math.round(Number(v)) || 0));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await onSave({
      ...draft,
      departureCities: citiesText.split(',').map((c) => c.trim()).filter(Boolean),
    });
    setBusy(false);
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className={cardCls}>
        <div>
          <h2 className="text-xl font-bold text-[#03045E]">By Road — Vehicles</h2>
          <p className="text-xs text-[#0077B6]">
            Daily rate is multiplied by trip days. If a group is bigger than the capacity, the calculator adds more vehicles automatically.
          </p>
        </div>
        {draft.roadVehicles.map((v, i) => (
          <div key={v.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-2xl border border-[#90E0EF] bg-[#CAF0F8]/25">
            <div className="sm:col-span-5">
              <label className={labelCls} htmlFor={`veh-name-${i}`}>Vehicle name</label>
              <input id={`veh-name-${i}`} className={inputCls} value={v.name}
                onChange={(e) => setDraft({ ...draft, roadVehicles: draft.roadVehicles.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            </div>
            <div className="sm:col-span-3">
              <label className={labelCls} htmlFor={`veh-cap-${i}`}>Seats</label>
              <input id={`veh-cap-${i}`} type="number" min={1} className={inputCls} value={v.capacityPassengers}
                onChange={(e) => {
                  const seats = Math.max(1, num(e.target.value));
                  setDraft({ ...draft, roadVehicles: draft.roadVehicles.map((x, j) => (j === i ? { ...x, capacityPassengers: seats, capacity: `Up to ${seats} Travellers` } : x)) });
                }} />
            </div>
            <div className="sm:col-span-3">
              <label className={labelCls} htmlFor={`veh-rate-${i}`}>PKR per day</label>
              <input id={`veh-rate-${i}`} type="number" min={0} className={inputCls} value={v.dailySurchargePKR}
                onChange={(e) => setDraft({ ...draft, roadVehicles: draft.roadVehicles.map((x, j) => (j === i ? { ...x, dailySurchargePKR: num(e.target.value) } : x)) })} />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <button type="button" aria-label={`Remove ${v.name}`} disabled={draft.roadVehicles.length <= 1}
                onClick={() => setDraft({ ...draft, roadVehicles: draft.roadVehicles.filter((_, j) => j !== i) })}
                className="p-2.5 rounded-lg border border-[#90E0EF] text-[#023E8A] disabled:opacity-40">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="sm:col-span-12">
              <label className={labelCls} htmlFor={`veh-desc-${i}`}>Description</label>
              <input id={`veh-desc-${i}`} className={inputCls} value={v.description}
                onChange={(e) => setDraft({ ...draft, roadVehicles: draft.roadVehicles.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
            </div>
          </div>
        ))}
        <button type="button"
          onClick={() => setDraft({ ...draft, roadVehicles: [...draft.roadVehicles, { id: `veh-${Date.now()}`, name: 'New vehicle', capacity: 'Up to 4 Travellers', capacityPassengers: 4, description: '', dailySurchargePKR: 5000, multiplier: 1 }] })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#0077B6] text-[#023E8A] text-xs font-bold hover:bg-[#CAF0F8]">
          <Plus className="w-4 h-4" aria-hidden="true" /> Add vehicle
        </button>
      </div>

      <div className={cardCls}>
        <h2 className="text-xl font-bold text-[#03045E]">By Air — Flight Packages</h2>
        {draft.airClasses.map((a, i) => (
          <div key={a.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-2xl border border-[#90E0EF] bg-[#CAF0F8]/25">
            <div className="sm:col-span-6">
              <label className={labelCls} htmlFor={`air-name-${i}`}>Package name</label>
              <input id={`air-name-${i}`} className={inputCls} value={a.name}
                onChange={(e) => setDraft({ ...draft, airClasses: draft.airClasses.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            </div>
            <div className="sm:col-span-5">
              <label className={labelCls} htmlFor={`air-rate-${i}`}>PKR per person</label>
              <input id={`air-rate-${i}`} type="number" min={0} className={inputCls} value={a.perPersonSurchargePKR}
                onChange={(e) => setDraft({ ...draft, airClasses: draft.airClasses.map((x, j) => (j === i ? { ...x, perPersonSurchargePKR: num(e.target.value) } : x)) })} />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <button type="button" aria-label={`Remove ${a.name}`} disabled={draft.airClasses.length <= 1}
                onClick={() => setDraft({ ...draft, airClasses: draft.airClasses.filter((_, j) => j !== i) })}
                className="p-2.5 rounded-lg border border-[#90E0EF] text-[#023E8A] disabled:opacity-40">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="sm:col-span-12">
              <label className={labelCls} htmlFor={`air-desc-${i}`}>Description</label>
              <input id={`air-desc-${i}`} className={inputCls} value={a.description}
                onChange={(e) => setDraft({ ...draft, airClasses: draft.airClasses.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
            </div>
          </div>
        ))}
        <button type="button"
          onClick={() => setDraft({ ...draft, airClasses: [...draft.airClasses, { id: `air-${Date.now()}`, name: 'New flight package', description: '', perPersonSurchargePKR: 30000, multiplier: 1 }] })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#0077B6] text-[#023E8A] text-xs font-bold hover:bg-[#CAF0F8]">
          <Plus className="w-4 h-4" aria-hidden="true" /> Add flight package
        </button>
      </div>

      <div className={cardCls}>
        <label className={labelCls} htmlFor="dep-cities">Departure cities (comma-separated)</label>
        <input id="dep-cities" className={inputCls} value={citiesText} onChange={(e) => setCitiesText(e.target.value)} />
      </div>

      <button type="submit" disabled={busy} className={primaryBtn}>
        <Save className="w-4 h-4" aria-hidden="true" /> {busy ? 'Saving…' : 'Save Prices'}
      </button>
    </form>
  );
}

// ----------------------------------------------------- WhatsApp + Excel
export function SettingsTab({
  ownerSettings,
  exportInfo,
  onSaveWhatsapp,
  onExportNow,
}: {
  ownerSettings: OwnerSettings;
  exportInfo: ExportInfo | null;
  onSaveWhatsapp: (value: string) => Promise<void>;
  onExportNow: () => Promise<unknown>;
}) {
  const [number, setNumber] = useState(ownerSettings.ownerWhatsapp);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNumber(ownerSettings.ownerWhatsapp);
  }, [ownerSettings.ownerWhatsapp]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await onSaveWhatsapp(number);
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={save} className={cardCls}>
        <div>
          <h2 className="text-xl font-bold text-[#03045E]">Owner WhatsApp Number</h2>
          <p className="text-xs text-[#0077B6]">
            Click Save to store the number in the server’s <strong>.env</strong> file (OWNER_WHATSAPP) and to write every record
            (bookings, inquiries, customers, destinations &amp; prices) into the Excel file.
          </p>
        </div>
        <div className="max-w-sm">
          <label className={labelCls} htmlFor="owner-wa">WhatsApp number</label>
          <input id="owner-wa" className={`${inputCls} tabular-nums`} value={number} inputMode="tel" placeholder="03XX-XXXXXXX or 923XXXXXXXXX"
            onChange={(e) => setNumber(e.target.value)} />
        </div>
        <button type="submit" disabled={busy} className={primaryBtn}>
          <Save className="w-4 h-4" aria-hidden="true" /> {busy ? 'Saving…' : 'Save & Export to Excel'}
        </button>
      </form>

      <div className={cardCls}>
        <div>
          <h2 className="text-xl font-bold text-[#03045E]">Excel Records</h2>
          <p className="text-xs text-[#0077B6]">
            The file is refreshed automatically after every new booking, inquiry or sign-up. Sheets: Bookings, Inquiries, Customers, Destinations &amp; Prices.
          </p>
          {exportInfo && (
            <p className="text-xs text-[#03045E] mt-2">
              Saved on the server in <strong>{exportInfo.folder}</strong>
              {exportInfo.lastExportAt ? ` · last updated ${new Date(exportInfo.lastExportAt).toLocaleString()}` : ' · not exported yet'}
              {exportInfo.lastError ? ` · last error: ${exportInfo.lastError}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="/api/admin/export.xlsx" className={primaryBtn}>
            <Download className="w-4 h-4" aria-hidden="true" /> Download Excel (.xlsx)
          </a>
          <a href="/api/admin/export.csv"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-[#0077B6] bg-white text-[#023E8A] text-sm font-bold hover:bg-[#CAF0F8]">
            <Download className="w-4 h-4" aria-hidden="true" /> Bookings (.csv)
          </a>
          <button type="button" onClick={() => void onExportNow()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-[#90E0EF] bg-white text-[#03045E] text-sm font-bold hover:bg-[#CAF0F8]">
            Update server file now
          </button>
        </div>
      </div>
    </div>
  );
}
