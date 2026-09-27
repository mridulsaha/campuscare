const CLIENT_PORTAL_URL = process.env.FRONTEND_DOMAIN_NAME || 'https://campuscare.mitsgwalior.in';

function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getInteractiveStyles() {
    return `
        <style>
            body, table, td, p, a, li, blockquote {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
            body {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background-color: #F1F5F9;
            }
            img {
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
                max-width: 100%;
            }
            table {
                border-collapse: collapse !important;
            }
            .email-shell {
                width: 100% !important;
                max-width: 620px !important;
                margin: 0 auto !important;
            }
            .interactive-card {
                background: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
                transition: all 0.2s ease-in-out;
            }
            .interactive-card:hover {
                border-color: #3B82F6 !important;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08) !important;
            }
            .btn-action-primary {
                display: inline-block;
                background-color: #1D4ED8;
                color: #FFFFFF !important;
                text-decoration: none;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 700;
                padding: 12px 24px;
                transition: background-color 0.2s ease;
            }
            .btn-action-primary:hover {
                background-color: #1E40AF !important;
            }
            .btn-action-secondary {
                display: inline-block;
                background-color: #F1F5F9;
                color: #1E293B !important;
                text-decoration: none;
                border: 1px solid #CBD5E1;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 700;
                padding: 12px 24px;
                transition: all 0.2s ease;
            }
            .btn-action-secondary:hover {
                background-color: #E2E8F0 !important;
                border-color: #94A3B8 !important;
            }
            details {
                background-color: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 8px;
                margin-bottom: 12px;
                padding: 12px 14px;
            }
            summary {
                cursor: pointer;
                font-weight: 700;
                font-size: 13px;
                color: #1E293B;
                list-style: none;
                display: flex;
                align-items: center;
                justify-content: space-between;
                outline: none;
            }
            summary::-webkit-details-marker {
                display: none;
            }
            .details-content {
                padding-top: 10px;
                margin-top: 10px;
                border-top: 1px solid #E2E8F0;
                font-size: 13px;
                line-height: 1.5;
                color: #475569;
            }
            @media only screen and (max-width: 600px) {
                .mobile-stack {
                    display: block !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    text-align: center !important;
                }
                .mobile-stack + .mobile-stack {
                    margin-top: 8px !important;
                }
                .mobile-padding {
                    padding: 20px 16px !important;
                }
            }
        </style>
    `;
}

function getHeaderFragment() {
    return `
        <tr>
            <td style="background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #2563EB 100%); padding: 24px 20px; text-align: left;">
                <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #93C5FD; font-weight: 700; margin-bottom: 4px;">
                    Madhav Institute of Technology &amp; Science, Gwalior
                </div>
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td align="left" style="vertical-align: middle;">
                            <div style="font-size: 22px; color: #FFFFFF; font-weight: 800; letter-spacing: -0.4px; line-height: 1.2;">
                                Campus Care
                            </div>
                            <div style="font-size: 12px; color: #CBD5E1; font-weight: 400; margin-top: 2px;">
                                Campus Complaint Portal
                            </div>
                        </td>
                        <td align="right" style="vertical-align: middle; white-space: nowrap;">
                            <span style="display: inline-block; background: rgba(255,255,255,0.15); padding: 5px 12px; border-radius: 8px; font-size: 11px; color: #FFFFFF; font-weight: 700; letter-spacing: 0.5px;">
                                OFFICIAL NOTICE
                            </span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    `;
}

function getFooterFragment() {
    return `
        <tr>
            <td style="background-color: #F8FAFC; padding: 22px 20px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #475569; font-weight: 700;">
                    Campus Care Portal &bull; MITS Gwalior
                </p>
                <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748B; line-height: 1.4;">
                    Race Course Road, Gola ka Mandir, Gwalior (M.P.) - 474005
                </p>
                <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                    This is an automated notification. Please do not reply directly to this email.
                </p>
            </td>
        </tr>
    `;
}

export function buildNotificationEmail({
    recipientName = 'Campus Member',
    badgeText = 'STATUS UPDATE',
    badgeColor = '#2563EB',
    headline = 'Notification',
    introText = '',
    details = [],
    actionNote = '',
    expandableDetails = null,
    ctaLabel = 'Open Campus Care Portal',
    ctaUrl = CLIENT_PORTAL_URL,
    secondaryCtaLabel = null,
    secondaryCtaUrl = null,
}) {
    const detailCardsHtml = details
        .filter((item) => item && item.value)
        .map(
            (item) => `
            <div class="interactive-card" style="margin-bottom: 8px; padding: 12px 14px;">
                <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 2px;">
                    ${escapeHtml(item.label)}
                </div>
                <div style="font-size: 14px; font-weight: 700; color: #0F172A; word-break: break-word;">
                    ${escapeHtml(String(item.value))}
                </div>
            </div>`
        )
        .join('');

    const expandableSection = expandableDetails
        ? `
        <details>
            <summary>
                <span>${escapeHtml(expandableDetails.title || 'View Details')}</span>
                <span style="font-size: 11px; color: #2563EB; text-decoration: underline;">Expand &#9662;</span>
            </summary>
            <div class="details-content">
                ${escapeHtml(expandableDetails.content)}
            </div>
        </details>`
        : '';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${escapeHtml(headline)}</title>
        ${getInteractiveStyles()}
    </head>
    <body style="margin: 0; padding: 16px 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-shell" style="max-width: 620px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #CBD5E1; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
            ${getHeaderFragment()}
            <tr>
                <td class="mobile-padding" style="padding: 28px 24px;">
                    <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; background-color: #EFF6FF; color: ${badgeColor}; border: 1px solid #BFDBFE; margin-bottom: 16px;">
                        ${escapeHtml(badgeText)}
                    </div>

                    <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #0F172A; font-weight: 800; line-height: 1.3;">
                        ${escapeHtml(headline)}
                    </h2>

                    <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                        Dear <strong>${escapeHtml(recipientName)}</strong>,
                    </p>

                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                        ${introText}
                    </p>

                    <div style="margin-bottom: 16px;">
                        ${detailCardsHtml}
                    </div>

                    ${expandableSection}

                    ${actionNote
        ? `
                    <div style="background-color: #F8FAFC; border-left: 4px solid ${badgeColor}; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #1E293B;">
                            ${actionNote}
                        </p>
                    </div>`
        : ''
    }

                    <div style="margin-top: 24px; margin-bottom: 24px; text-align: center;">
                        <a href="${ctaUrl}" target="_blank" class="btn-action-primary mobile-stack">
                            ${escapeHtml(ctaLabel)} &rarr;
                        </a>
                        ${secondaryCtaLabel && secondaryCtaUrl
        ? `
                        <a href="${secondaryCtaUrl}" target="_blank" class="btn-action-secondary mobile-stack" style="margin-left: 8px;">
                            ${escapeHtml(secondaryCtaLabel)}
                        </a>`
        : ''
    }
                    </div>

                    <div style="border-top: 1px solid #E2E8F0; padding-top: 16px;">
                        <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                            You can check updates, track progress, or view attachments anytime on the portal.
                        </p>
                    </div>
                </td>
            </tr>
            ${getFooterFragment()}
        </table>
    </body>
    </html>
    `;
}

export function buildAmpNotificationEmail({
    recipientName = 'Campus Member',
    badgeText = 'STATUS UPDATE',
    headline = 'Notification',
    introText = '',
    details = [],
    actionNote = '',
    ctaLabel = 'Open Campus Care Portal',
    ctaUrl = CLIENT_PORTAL_URL,
}) {
    const detailItems = details
        .filter((item) => item && item.value)
        .map(
            (item) => `
            <div class="card">
                <span class="label">${escapeHtml(item.label)}</span>
                <span class="value">${escapeHtml(String(item.value))}</span>
            </div>`
        )
        .join('');

    return `<!doctype html>
    <html ⚡4email data-css-strict>
    <head>
        <meta charset="utf-8">
        <script async src="https://cdn.ampproject.org/v0.js"></script>
        <script async custom-element="amp-accordion" src="https://cdn.ampproject.org/v0/amp-accordion-0.1.js"></script>
        <style amp4email-boilerplate>body{visibility:hidden}</style>
        <style amp-custom>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F1F5F9; margin: 0; padding: 12px; }
            .shell { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; }
            .header { background: #1E3A8A; padding: 20px; color: #FFFFFF; }
            .body { padding: 24px; color: #1E293B; }
            .badge { display: inline-block; padding: 4px 10px; background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
            .title { font-size: 18px; font-weight: 800; margin: 0 0 10px; }
            .card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; }
            .label { font-size: 10px; color: #64748B; font-weight: 700; text-transform: uppercase; display: block; }
            .value { font-size: 14px; font-weight: 700; color: #0F172A; }
            .btn { display: inline-block; background: #1D4ED8; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 700; text-align: center; }
            .note { background: #F8FAFC; border-left: 4px solid #2563EB; padding: 12px; border-radius: 4px; margin: 16px 0; font-size: 13px; }
        </style>
    </head>
    <body>
        <div class="shell">
            <div class="header">
                <div style="font-size: 10px; text-transform: uppercase; color: #93C5FD; font-weight: 700;">Madhav Institute of Technology &amp; Science</div>
                <div style="font-size: 20px; font-weight: 800;">Campus Care Portal</div>
            </div>
            <div class="body">
                <span class="badge">${escapeHtml(badgeText)}</span>
                <h2 class="title">${escapeHtml(headline)}</h2>
                <p style="font-size: 14px; line-height: 1.5;">Dear <strong>${escapeHtml(recipientName)}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.5;">${introText}</p>
                ${detailItems}
                ${actionNote ? `<div class="note">${actionNote}</div>` : ''}
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${ctaUrl}" class="btn">${escapeHtml(ctaLabel)} &rarr;</a>
                </div>
            </div>
        </div>
    </body>
    </html>`;
}

export function buildDigestEmailShell({
    recipientName = 'Colleague',
    subtitle = '',
    statCards = [],
    contentHtml = '',
    ctaUrl = CLIENT_PORTAL_URL,
}) {
    let statCardsHtml = '';
    for (let i = 0; i < statCards.length; i += 2) {
        const first = statCards[i];
        const second = statCards[i + 1];

        statCardsHtml += `
            <tr>
                <td style="padding: 4px; width: 50%;">
                    <div style="padding: 12px 8px; background: ${first.bg}; border: 1px solid ${first.border}; border-radius: 8px; text-align: center;">
                        <div style="font-size: 10px; color: ${first.color}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(first.label)}</div>
                        <div style="font-size: 22px; font-weight: 800; color: ${first.color}; margin-top: 4px;">${first.value}</div>
                    </div>
                </td>
                ${second
            ? `
                <td style="padding: 4px; width: 50%;">
                    <div style="padding: 12px 8px; background: ${second.bg}; border: 1px solid${second.border}; border-radius: 8px; text-align: center;">
                        <div style="font-size: 10px; color: ${second.color}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(second.label)}</div>
                        <div style="font-size: 22px; font-weight: 800; color: ${second.color}; margin-top: 4px;">${second.value}</div>
                    </div>
                </td>`
            : `<td style="padding: 4px; width: 50%;"></td>`
        }
            </tr>
        `;
    }

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Campus Care Daily Briefing</title>
        ${getInteractiveStyles()}
    </head>
    <body style="margin: 0; padding: 16px 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-shell" style="max-width: 620px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #CBD5E1;">
            ${getHeaderFragment()}
            <tr>
                <td class="mobile-padding" style="padding: 28px 24px;">
                    <h2 style="margin: 0 0 6px 0; font-size: 20px; color: #0F172A; font-weight: 800;">
                        Good morning, ${escapeHtml(recipientName)}
                    </h2>
                    <p style="margin: 0 0 18px 0; color: #64748B; font-size: 13px; line-height: 1.4;">
                        ${subtitle}
                    </p>

                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                        ${statCardsHtml}
                    </table>

                    <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                        ${contentHtml}
                    </div>

                    <div style="margin-top: 24px; text-align: center;">
                        <a href="${ctaUrl}" target="_blank" class="btn-action-primary mobile-stack">
                            Open Portal &rarr;
                        </a>
                    </div>
                </td>
            </tr>
            ${getFooterFragment()}
        </table>
    </body>
    </html>
    `;
}