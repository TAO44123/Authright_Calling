"use client";

import { useState } from "react";

function formatPhoneNumber(phoneNumber: string) {
  if (/^\+1\d{10}$/.test(phoneNumber)) {
    return "+1 (" + phoneNumber.slice(2, 5) + ") " + phoneNumber.slice(5, 8) + "-" + phoneNumber.slice(8);
  }
  return phoneNumber;
}

export default function PhoneCard({ phoneNumber }: { phoneNumber: string }) {
  const [copyStatus, setCopyStatus] = useState("");
  const ready = Boolean(phoneNumber);

  async function copyNumber() {
    if (!phoneNumber) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(phoneNumber);
      } else {
        const input = document.createElement("textarea");
        input.value = phoneNumber;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Clipboard unavailable");
      }
      setCopyStatus("Number copied");
    } catch {
      setCopyStatus("Could not copy. Please select the number above.");
    }
  }

  return (
    <div className="phone-card">
      <div className="phone-card-top">
        <span className="phone-icon" aria-hidden="true">☎</span>
        <span className="phone-card-label">PHONE RECEPTION</span>
      </div>
      <p className="phone-card-title">Call this number</p>
      <p className={"phone-number" + (ready ? "" : " phone-number-pending")}>
        {ready ? formatPhoneNumber(phoneNumber) : "Number coming soon"}
      </p>
      <p className="phone-card-caption">
        {ready ? "Tap Call on your phone to open the dialer" : "Calling will be available when the number is connected"}
      </p>
      <div className="phone-actions">
        {ready ? (
          <a className="button button-primary" href={"tel:" + phoneNumber}>Call</a>
        ) : (
          <button className="button button-primary" type="button" disabled>Call</button>
        )}
        <button className="button button-secondary" type="button" onClick={copyNumber} disabled={!ready}>
          Copy number
        </button>
      </div>
      <p className="copy-status" role="status" aria-live="polite">{copyStatus || "\u00a0"}</p>
      <div className="phone-card-bottom">Real phone call · AI answered</div>
    </div>
  );
}
