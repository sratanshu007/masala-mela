/* Masala Mela — character portraits (SVG). (c) Deific Digital */
(function (G) {
  'use strict';
  const O = 'stroke="#3b1f0e" stroke-width="3"';
  const eyes = (y, mood) => mood === 'sad'
    ? `<path d="M38 ${y}q5 -4 10 0M62 ${y}q5 -4 10 0" ${O} fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="43" cy="${y}" rx="4.5" ry="6" fill="#2b1608"/><ellipse cx="67" cy="${y}" rx="4.5" ry="6" fill="#2b1608"/><circle cx="44.5" cy="${y - 2}" r="1.6" fill="#fff"/><circle cx="68.5" cy="${y - 2}" r="1.6" fill="#fff"/>`;

  const C = {
    _n: 0,
    meethi(mood) {
      return `<svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 120q0-34 37-38q37 4 37 38z" fill="#D7263D" ${O}/>
        <path d="M18 104q37 -18 74 0" fill="none" stroke="#FFC83D" stroke-width="5"/>
        <path d="M22 60q-6 40 6 58" fill="none" stroke="#1b1b1b" stroke-width="9" stroke-linecap="round"/>
        <circle cx="55" cy="52" r="30" fill="#C98B5E" ${O}/>
        <path d="M24 50q4-30 31-31q27 1 31 31q-10-14-31-15q-21 1-31 15z" fill="#1b1b1b"/>
        <circle cx="55" cy="44" r="2.6" fill="#D7263D"/>
        ${eyes(56, mood)}
        <circle cx="36" cy="66" r="5" fill="#FF8A80" opacity=".6"/><circle cx="74" cy="66" r="5" fill="#FF8A80" opacity=".6"/>
        ${mood === 'sad' ? `<path d="M47 74q8-6 16 0" ${O} fill="none" stroke-linecap="round"/>` : `<path d="M45 70q10 10 20 0" ${O} fill="#8B1E1E" stroke-linecap="round"/>`}
        <path d="M84 30q14 6 6 30" fill="none" stroke="#D7263D" stroke-width="8" stroke-linecap="round"/>
      </svg>`;
    },
    dabbu(mood) {
      const gid = 'st' + (++C._n);
      const mouth = mood === 'sad' ? `<path d="M45 76q10 -8 20 0" ${O} fill="none"/>`
        : mood === 'wow' ? `<ellipse cx="55" cy="76" rx="7" ry="8" fill="#8B1E1E" ${O}/>`
        : `<path d="M42 70q13 14 26 0z" fill="#8B1E1E" ${O}/>`;
      return `<svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="${gid}" x1="0" x2="1"><stop offset="0" stop-color="#8C99A6"/><stop offset=".35" stop-color="#F4F7FA"/><stop offset="1" stop-color="#6E7B88"/></linearGradient></defs>
        <path d="M35 22q20-22 40 0" fill="none" stroke="#37474F" stroke-width="6"/>
        <rect x="20" y="22" width="70" height="14" rx="6" fill="url(#${gid})" ${O}/>
        <rect x="22" y="36" width="66" height="28" rx="6" fill="url(#${gid})" ${O}/>
        <rect x="22" y="64" width="66" height="28" rx="6" fill="url(#${gid})" ${O}/>
        <rect x="22" y="92" width="66" height="20" rx="6" fill="url(#${gid})" ${O}/>
        ${eyes(52, mood)}
        ${mouth}
        <path d="M22 70q-12 6 -10 18M88 70q12 6 10 18" fill="none" ${O} stroke-linecap="round"/>
      </svg>`;
    },
    dadi() {
      return `<svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 120q0-36 41-40q41 4 41 40z" fill="#FFF8E1" ${O}/>
        <path d="M14 108q41-16 82 0" fill="none" stroke="#FF8A3D" stroke-width="6"/>
        <circle cx="55" cy="52" r="29" fill="#D9A27A" ${O}/>
        <path d="M26 50q3-28 29-28q26 0 29 28q-6-10-29-12q-23 2-29 12z" fill="#ECEFF1" ${O}/>
        <circle cx="55" cy="20" r="10" fill="#ECEFF1" ${O}/>
        <circle cx="43" cy="56" r="8" fill="none" ${O}/><circle cx="67" cy="56" r="8" fill="none" ${O}/><path d="M51 56h8" ${O}/>
        <circle cx="43" cy="56" r="2.6" fill="#2b1608"/><circle cx="67" cy="56" r="2.6" fill="#2b1608"/>
        <path d="M45 72q10 8 20 0" ${O} fill="none" stroke-linecap="round"/>
        <circle cx="55" cy="40" r="2.4" fill="#D7263D"/>
      </svg>`;
    },
    seth(mood) {
      return `<svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 120q0-36 43-40q43 4 43 40z" fill="#8D6E63" ${O}/>
        <path d="M55 82v38" stroke="#5D4037" stroke-width="3"/><circle cx="55" cy="94" r="2.5" fill="#FFC83D"/><circle cx="55" cy="106" r="2.5" fill="#FFC83D"/>
        <circle cx="55" cy="52" r="31" fill="#BCAAA4" ${O}/>
        <path d="M26 42q4-24 29-25q25 1 29 25q-12-8-29-8q-17 0-29 8z" fill="#616161"/>
        ${mood === 'happy' ? eyes(52, 'happy') : `<path d="M37 46l12 5M73 46l-12 5" ${O} stroke-linecap="round"/><ellipse cx="43" cy="55" rx="4" ry="3" fill="#2b1608"/><ellipse cx="67" cy="55" rx="4" ry="3" fill="#2b1608"/>`}
        <path d="M30 70q12-10 25-3q13-7 25 3q-6 4-12 2q-7-3-13 1q-6-4-13-1q-6 2-12-2z" fill="#3E2723" ${O}/>
        ${mood === 'happy' ? `<path d="M46 78q9 7 18 0" ${O} fill="none" stroke-linecap="round"/>` : `<path d="M48 80q7-4 14 0" ${O} fill="none" stroke-linecap="round"/>`}
        <path d="M51 58q4 10 -2 10" ${O} fill="none"/>
      </svg>`;
    },
    karela() {
      return `<svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg">
        <path d="M55 8q30 10 30 56q0 46-30 52q-30-6-30-52q0-46 30-56z" fill="#7CB342" ${O}/>
        ${[[40, 30], [65, 28], [52, 48], [38, 70], [70, 72], [55, 92], [45, 100], [67, 98]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#558B2F"/>`).join('')}
        <path d="M50 8q5-8 12-4" ${O} fill="#33691E"/>
        <path d="M36 52l14 6M74 52l-14 6" ${O} stroke-linecap="round"/>
        <circle cx="44" cy="62" r="4.5" fill="#2b1608"/><circle cx="66" cy="62" r="4.5" fill="#2b1608"/>
        <path d="M44 82q11-8 22 0" ${O} fill="none" stroke-linecap="round"/>
      </svg>`;
    }
  };

  G.MM_CHARS = function (who, mood) { return (C[who] || C.dabbu)(mood || 'happy'); };
})(window);
