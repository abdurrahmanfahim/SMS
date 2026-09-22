# Mobile-complete requirement (D-16, binding)

**Requirement (Owner):** any institution that wants to run everything on phones must be able to do so comfortably, with no hassle and no laptop. Every task in every role is designed phone-first and finished on a phone. Tablets and desktops are enhancements, never a requirement.

## 1. Devices

| Priority | Device | Why |
|---|---|---|
| 1 | Low-end and mid Android, Chrome, 360×640 up to about 412×915, 2–3 GB RAM | Android was about 91% of mobile use in Bangladesh in August 2026 (StatCounter) |
| 2 | iPhone, Safari and installed web app | About 9% (same source). Some web-app features differ; see §4 |
| 3 | Tablet, laptop | Same app, more room |

Real-device passes are done by the Owner with a checklist, on at least one low-end Android and, if possible, one iPhone.

## 2. Rules (added to `docs/spec/ux-standard.md`)

1. No task needs a laptop, a mouse, hover, right-click or drag. Every task works with touch only.
2. No horizontal page scroll and no pinch-zoom needed. Wide data becomes cards, or a grid inside its own scroll container with sticky header and first column.
3. Least typing: pick lists, presets, defaults, remembered choices ("save and add next"), pasted lists, imports. Numeric fields open the numeric keypad and accept Bangla digits.
4. One-handed reach: frequent actions in the lower part of the screen; sticky action bar; no primary action at the top corner only.
5. The on-screen keyboard never hides the focused field or its primary action.
6. Files and photos come from the phone: gallery, camera, file picker. Outputs leave the phone by share sheet or download, never by "open on your computer".
7. Nothing needs a big memory: paginate, compress photos on the device, stream long lists.
8. Long tasks show progress and can be resumed after the phone sleeps or the connection drops.
9. Every screen works one-handed on a 360 px width with text enlarged one step.
10. Help, and a way to reach support, are in the same place on every screen.

## 3. Task matrix (phone pattern for every job)

| Job | Role | Phone pattern | Hard part | Built in |
|---|---|---|---|---|
| Install and sign in | all | Bangla install guide for Android and iPhone; stay signed in on a personal phone; re-ask the password only for sensitive actions | iPhone install is manual | M0-W1, M1-P2 |
| Institution setup, logo | admin | Checklist wizard with presets; logo from camera or gallery with crop | Cropping and compressing on device | M0-U1, M1-W2, M1-W3 |
| Academic structure | admin | Presets, bottom sheets, up and down buttons for order | Many small forms | M1-A1 |
| Users and invites | admin | Invite link shared through the share sheet (WhatsApp, SMS); temporary password shown once with a copy button | None | M1-P2, M1-W2 |
| Add students | admin, office | Quick add ("save and add next"), paste a list from WhatsApp or Notes, pick a file, import from Munshi | Building a spreadsheet on a phone | M1-A2, M1-A3, M2-I1 |
| Attendance | teacher | One tap per student, "mark all present" then fix exceptions, offline queue, sync status | Offline on iPhone (no background sync) | M2-A5 |
| Exam setup | admin | Wizard with grade-scheme presets; bands edited in a full-screen sheet | Complex editor on a small screen | M2-E1 |
| Marks entry | teacher | Subject-wise phone list: name and one input per row, numeric keypad, "n of 40 entered", auto-advance, offline queue | Speed and typing errors | M1-W4, M2-E2 |
| Results review | admin, teacher | Student cards with rank, filters and search; tabulation as cards and as PDF | Wide tabulation sheet | M2-E3 |
| Publish | admin | One confirmation that states the consequence with counts; unpublish path | None | M2-E3 |
| Marksheets | admin, guardian | PDF made on the server; share through the share sheet (feature-detected, with download fallback); per-student WhatsApp; one merged PDF per class; print through the phone print dialog or at a shop | PDF on phones, printing | M0-S1, M2-E4 |
| Fees (M3) | accountant | Quick collect flow, receipt shared as PDF or message, dues as cards | Speed at a busy counter | M3-F |
| Notices and alerts (M3) | admin, teacher | Templates, audience picker, Bangla keyboard | Short Unicode text costs more per message | M2-C1, M3-T |
| Reports and exports | admin | PDF and CSV through share or download; views readable on the phone without a spreadsheet app | Excel is rare on phones | M2-E3, M3 |
| Guardian view | guardian | Child switcher, cards, add to home screen | Low digital confidence | M3-G |

## 4. Hard parts and what the research says

- **Sharing files:** the Web Share API can share files, but code must check `navigator.canShare({ files })` first; PDFs are among the allowed types. Always offer a download fallback. Source: web.dev, https://web.dev/articles/web-share
- **Printing and PDF on phones:** phone browsers are weak at printing, so marksheet PDFs are generated on a server and delivered as a file. `M0-S1` must test on a real low-end Android and an iPhone: generate, view, share, print.
- **iPhone web apps:** Web Push works only for apps installed to the home screen (iOS 16.4 and later) and Background Sync is not supported (https://firt.dev/notes/pwa-ios/). So sync runs when the app opens and when it returns to the foreground, alerts to guardians use text messages instead of push, and an install guide is part of onboarding. Storage persistence on iOS is also weaker than on Android (MagicBell guide, secondary).
- **On-screen keyboard:** by default the keyboard resizes only the visual viewport, so fixed bars can end up covering inputs. The viewport option `interactive-widget=resizes-content` changes this (MDN: https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Viewport_meta_element; Chrome 108 or later; one developer reported Edge ignoring it, so treat as unverified). Use it plus a visual-viewport fallback and test on real devices.
- **Play Store presence (optional, M4):** a Trusted Web Activity wrapper could make installs and trust easier on Android; verify current requirements before committing.

## 5. Hassle targets (hypotheses to validate in `M1-O4`, then keep as acceptance criteria)

- Attendance for a 40-student class: 60 seconds or less.
- One subject's marks for 40 students: 4 minutes or less, with no typing errors surviving to publish.
- Add one student: 30 seconds or less; 30 students by pasting a list: 2 minutes or less.
- Share one marksheet: 3 taps or fewer after results are ready.
- Publish results: 5 taps or fewer.

## 6. Acceptance

- Every UI task states its phone behaviour and passes the Definition of Done item on phone completeness (README §9).
- `M2-Q3`: the Owner runs the whole journey on phones only, from first sign-in to shared marksheets, and keeps a hassle log. Any step that needs a laptop, zoom, horizontal page scroll, a hidden keyboard or a failed share is a defect, not a wish.
