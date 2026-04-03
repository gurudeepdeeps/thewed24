# PRODUCT REQUIREMENT DOCUMENT
## The Wed 24
### Premium Wedding Photography & Videography Website

---

| | |
|---|---|
| **Version** | 4.0.0 |
| **Date** | March 2026 |
| **Status** | Draft — Ready for Build |
| **Author** | The Wed 24 |

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Infrastructure](#2-tech-stack--infrastructure)
3. [Design System](#3-design-system)
4. [SEO Strategy](#4-seo-strategy)
5. [Pages & Features](#5-pages--features)
6. [Admin Dashboard](#6-admin-dashboard-admin)
7. [Firestore Collections Schema](#7-firestore-collections-schema)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Recommended Project File Structure](#9-recommended-project-file-structure)
10. [Decisions & Open Items](#10-decisions--open-items)
11. [Glossary](#11-glossary)

---

# 1. Project Overview

## 1.1 Purpose

This document defines the complete product requirements for building a premium, cinematic luxury website for The Wed 24 — a professional wedding photographer and videographer. This PRD is intended for use with an AI coding agent or AI copilot and serves as the single source of truth for all design, feature, and technical decisions.

## 1.2 Product Vision

The website must communicate exclusivity, artistry, and emotion. It is not a portfolio template — it is a premium brand experience. Every pixel, interaction, and word must reinforce that The Wed 24 is a top-tier, luxury wedding storyteller. The site should feel like flipping through a high-end fashion magazine, not browsing a photo agency.

## 1.3 Target Audience

- Engaged couples planning premium/luxury weddings
- Wedding planners scouting photographers for high-value clients
- Families of the bride/groom viewing delivered client albums
- Corporate or editorial clients for other photography work

## 1.4 Key Objectives

- Establish an unmistakable luxury brand identity online
- Convert website visitors into inquiries through emotional storytelling
- Provide a seamless, shareable client album delivery experience — accessible to anyone with the link
- Rank on Google for targeted wedding photography keywords (SEO)
- Enable easy content management through an admin dashboard — no developer needed

---

# 2. Tech Stack & Infrastructure

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML5 + CSS3 + Vanilla JavaScript (ES6+) | Semantic markup, styling, and interactivity |
| Styling | Custom CSS (CSS Variables + Flexbox/Grid) + GSAP / CSS Animations | Hand-crafted design system + scroll and UI animations |
| Deployment | Firebase Hosting | Static site hosting with global CDN |
| Domain | Custom Domain (own) | Connected via Firebase Hosting DNS |
| Backend / DB | Firebase Firestore (NoSQL) | All collections: films, albums, packages, testimonials, inquiries |
| Storage | Firebase Storage | Photos, videos, client albums |
| Realtime Database | Firebase Realtime DB | Live reactions, comments, album view counts |
| Authentication | Firebase Auth | Admin login only (client albums are public) |
| CMS / Admin | Custom Admin Dashboard | Standalone HTML/JS admin panel |
| Analytics | Google Analytics 4 (GA4) | Traffic, conversions, SEO data |
| SEO | Manual meta tags + Schema.org JSON-LD | Meta, OG tags, structured data per page |
| Forms | Vanilla JS form handling + Resend | Contact form validation + email notifications |
| WhatsApp | WhatsApp Click-to-Chat API | Pre-filled inquiry with package info |

## 2.1 Deployment Architecture

- **Repository:** GitHub (private), connected to Firebase Hosting for auto-deploy via Firebase CLI or GitHub Actions on push to `main`
- **Environment Variables:** Firebase config keys injected at build time via a `env.js` config file (never committed to Git); Resend API key used server-side only via a lightweight Firebase Cloud Function
- **Branch strategy:** `main` (production), `dev` (staging preview via Firebase Hosting preview channels)
- **Firebase project:** Separate Firestore collections for each domain entity (see Section 7)
- **Firebase Storage buckets:** `/films/`, `/albums/{clientId}/`, `/hero/`, `/gallery/`

---

# 3. Design System

## 3.1 Brand Identity — Cinematic Luxury

The entire website must feel dark, editorial, and cinematic. Think: high-end fashion magazine meets fine-art photography gallery. Negative space is a design asset. Gold is never decorative — it is a signal.

## 3.2 Color Palette

| Role | Value |
|---|---|
| Primary Background | `#0B0B0B` — Deep Black |
| Secondary Background | `#1A1A1A` — Dark Grey (cards, modals) |
| Primary Text | `#F5F5F5` — Soft White |
| Secondary Text | `#A0A0A0` — Muted Grey |
| Accent / Luxury | `#C9A96E` — Gold Tone |
| Borders / Dividers | `#2A2A2A` — Subtle Dark |
| Overlay (video/image) | `rgba(0,0,0,0.55)` — Dark scrim |

> **Gold (`#C9A96E`) usage is intentionally minimal:** CTA buttons, hover underlines, active nav indicators, section dividers, and icon accents only. It must never be used as a background or large fill.

## 3.3 Typography

| Usage | Font |
|---|---|
| Headings / Display | Cormorant Garamond (Primary) or Cinzel (for all-caps labels) |
| Sub-headings | Playfair Display |
| Body Text / UI | Poppins (Regular 400, Light 300) |
| Fallback Stack | `serif` (headings), `sans-serif` (body) |
| Loading method | Google Fonts — standard `<link rel="preconnect">` + `<link rel="stylesheet">` in `<head>` with `font-display: swap` to prevent layout shift |

## 3.4 Spacing & Layout

- Max content width: `1280px`, centered with auto margins
- Section padding: `120px` vertical on desktop, `64px` on mobile
- Grid: 12-column CSS Grid for complex layouts, Flexbox for components
- Responsive breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)

## 3.5 Motion & Animation (CSS + GSAP)

- Page transitions: smooth fade-in on page load using CSS `@keyframes` or GSAP `fadeIn` (0.4s ease)
- Section reveal: elements slide up + fade in when entering viewport via `IntersectionObserver` API
- Image hover: subtle `scale(1.04)` on gallery cards using CSS `transform` + `transition: 0.5s ease`
- Cursor: custom cursor (circle outline, gold fill on hover over links/buttons) via a tracked `div` element updated on `mousemove`
- No jarring or excessive motion — every animation must feel intentional

## 3.6 UI Components

- **CTA Button:** Dark background, gold border, gold text — hover fills gold, text turns black
- **Navigation:** Transparent on hero, solid `#0B0B0B` on scroll — logo left, links center-right
- **Cards:** `#1A1A1A` background, subtle border `#2A2A2A`, image zoom on hover
- **Modals:** Full-screen dark overlay, Framer Motion scale animation
- **Loading states:** Skeleton shimmer in dark grey

---

# 4. SEO Strategy

## 4.1 Technical SEO

- **Approach:** All pages are static HTML files with manually crafted `<head>` blocks — unique `<title>`, `<meta name="description">`, `<link rel="canonical">`, and Open Graph tags per page
- **Sitemap:** Hand-authored `sitemap.xml` in the project root, updated whenever new pages are added
- **Robots.txt:** Allow all crawlers; disallow `/admin/` and `/albums/`
- **Core Web Vitals:** Target LCP < 2.5s, CLS < 0.1, FID < 100ms
- **Image optimization:** Use `loading="lazy"` and `width`/`height` attributes on all `<img>` tags; images pre-exported as WebP from the admin upload flow (Firebase Storage)
- **Video optimization:** `<video>` elements use `preload="none"` with a `poster` frame; no autoplay without explicit user gesture
- **Performance:** Firebase Hosting CDN, Google Fonts subset via `text=` param or `font-display: swap`, assets minified at build time

## 4.2 On-Page SEO

- Each page has a unique H1 with primary keyword
- Semantic HTML5 structure: `<main>`, `<article>`, `<section>`, `<nav>`, `<header>`, `<footer>`
- Alt text on all images — descriptive + keyword-rich (managed via admin dashboard)
- Internal linking: Pages cross-link naturally (Packages → Contact, Films → About, etc.)
- URL structure: `/films.html`, `/packages.html`, `/about.html`, `/testimonials.html`, `/contact.html`, `/album.html?id=[uuid]` (public, link-based access)

## 4.3 Structured Data (JSON-LD)

- `LocalBusiness` schema on every page (photographer, city, contact)
- `Person` schema on About page
- `BreadcrumbList` on inner pages
- `VideoObject` schema on Films page (title, description, thumbnailUrl, uploadDate)
- `Review` / `AggregateRating` schema on Testimonials page
- `FAQPage` schema on Packages page

## 4.4 Target Keywords

| Keyword | Type | Target Page |
|---|---|---|
| wedding photographer [city] | Primary / Local | Home |
| wedding videographer [city] | Primary / Local | Home / Films |
| luxury wedding photography India | Long-tail | Home / About |
| cinematic wedding films [city] | Long-tail | Films |
| wedding photography packages [city] | Commercial | Packages |
| best wedding photographer [city] | Branded | Home |
| The Wed 24 photographer | Branded | Home / About |

---

# 5. Pages & Features

## 5.1 Home Page (`/`)

### 5.1.1 Hero Section
- Full-viewport video or image hero (Firebase-hosted, autoplay muted loop)
- Overlay text: Brand name in Cormorant Garamond, tagline below in Poppins
- Single CTA button: 'View Our Work' or 'Book a Consultation'
- Subtle scroll indicator animation at the bottom

### 5.1.2 Featured Work Reel
- 3–4 curated horizontal cards showcasing best wedding films/photos
- Hover reveals title, location, and year — links to Films or Gallery

### 5.1.3 Brief About Section
- 2–3 sentence brand philosophy + portrait photo (optional)
- Link: 'More About Sagar' → `/about`

### 5.1.4 Testimonial Snippet
- 1–2 rotating testimonials pulled from Firestore
- Link: 'Read all stories' → `/testimonials`

### 5.1.5 Package Teaser
- 3 package cards (Bronze, Silver, Gold or equivalent) with starting price
- CTA: 'See Full Packages' → `/packages`

### 5.1.6 Instagram Feed Strip *(Optional — Phase 2)*
- 6-tile grid pulling latest Instagram posts via Instagram Basic Display API

---

## 5.2 Films Page (`/films`)

Showcases cinematic wedding films. This is a high-impact page and should feel like a film festival reel.

### Content & Layout
- Masonry or full-width grid of film thumbnails with title and location overlay
- Each card shows: custom thumbnail (Firebase), film title, couple name, location, year
- Click opens a full-screen modal with the video player

### Video Player
- All video sources served directly from Firebase Storage
- Custom controls: play/pause, seek bar, volume, fullscreen, quality selector
- Autoplay on modal open (muted by default, unmute button prominent)
- Keyboard shortcuts: `Space` (play/pause), `F` (fullscreen), `M` (mute), Arrow keys (seek)
- Mobile: native-feel controls, tap to pause/play

### Filtering
- Filter bar: All | Highlight Reels | Full Films | By Year | By Location
- Smooth animation on filter change (no page reload — client-side filtering)

---

## 5.3 Client Album (`/albums/[uuid]`)

A public gallery portal for delivered clients — accessible to anyone who has the link. No login or PIN required. The album link itself acts as the access control.

### Access Model
- Each album has a unique, unguessable URL: `/albums/[uuid]` — generated by admin when the album is created
- No login, PIN, or authentication required — the UUID in the URL is the access token
- Admin can deactivate (revoke) any album link at any time from the dashboard — the URL will return a graceful 404-style message
- Albums are not indexed or listed publicly — only accessible via the direct UUID link shared by admin

### Album Features
- View all photos in a beautiful masonry grid
- Lightbox viewer: full-screen photo view with prev/next navigation, keyboard support
- Download individual photos or full album as ZIP (Firebase download URL)
- **Video section** within the album: full player controls (play, pause, seek, volume, fullscreen, quality)
- Share gallery: generate a temporary share link, shareable with family
- **Comments / Reactions:** clients can heart-react to individual photos; leave text comments (saved to Firebase Realtime DB for live updates)
- Watermark toggle: admin can enable/disable watermark on delivered photos

---

## 5.4 Packages Page (`/packages`)

### Package Display
- 3–4 tiered package cards in a visually distinct, premium layout
- Each card: package name, price (or 'Starting from'), inclusions list, highlight badge (e.g. 'Most Popular')
- Packages data stored in Firestore — fully editable from admin dashboard

### WhatsApp Integration
- Each package card has an 'Enquire on WhatsApp' button
- On click, opens WhatsApp with a pre-filled message:
  > *"Hi Sagar! I'm interested in the [Package Name] package. My wedding is on [date]. Please share more details."*
- Phone number + message pre-filled via `wa.me` deep link with URL-encoded text
- No API subscription required — uses WhatsApp Click-to-Chat (`wa.me`) format

### FAQ Section *(SEO)*
- 5–8 FAQs about the photography/videography process
- Accordion UI with `FAQPage` JSON-LD schema markup for Google rich results

---

## 5.5 About Page (`/about`)

- Hero: Full-bleed cinematic portrait or behind-the-scenes photo
- Brand Story section: 3–4 paragraphs about The Wed 24's journey, philosophy, and approach
- Stats strip: 'X Weddings Captured | Y Cities | Z Years' (animated count-up on scroll)
- Featured In / Press Logos (if applicable)
- Equipment / Style section: what makes the work unique
- `Person` JSON-LD schema for Google Knowledge Panel eligibility

---

## 5.6 Testimonials Page (`/testimonials`)

- Full page of client stories — not just star ratings, but real narratives
- Card layout: couple photo (optional), names, wedding location, testimonial text
- Star rating (1–5) displayed using gold stars
- Data stored in Firestore — admin can add/edit/delete from dashboard
- `AggregateRating` JSON-LD schema for Google star snippet eligibility
- Masonry or 2-column grid, staggered animation on load

---

## 5.7 Contact Page (`/contact`)

### Contact Form
- Fields: Full Name, Email Address, Phone Number, Wedding Date (date picker), Wedding Venue/City, Message, How did you hear about us? (dropdown)
- Built with vanilla JavaScript form validation — inline error messages, field-level checks
- On submit: form data sent to a lightweight Firebase Cloud Function that emails Sagar via Resend API and sends a confirmation email to the client
- Form submissions stored in Firestore for admin dashboard inbox

### WhatsApp Button
- Prominent floating WhatsApp button on Contact page (and as a global sticky widget)
- Pre-filled message: *"Hi Sagar! I found you online and would love to discuss wedding coverage."*

### Additional Contact Info
- Email address (clickable `mailto:` link)
- Instagram handle (external link)
- City of operation
- Google Map embed (optional)

---

# 6. Admin Dashboard (`/admin`)

A fully custom admin panel built as a separate set of HTML pages, accessible only to authenticated admin users. No third-party CMS. Admin login is via Firebase Auth with a single superadmin account.

## 6.1 Authentication

- Route: `/admin/login.html` — protected by Firebase Auth (Email/Password sign-in)
- All `/admin/` pages check Firebase Auth session state on load via `onAuthStateChanged`; unauthenticated users are immediately redirected to `/admin/login.html`
- Logout clears the Firebase Auth session and redirects to `/admin/login.html`

## 6.2 Dashboard Sections

### 🎬 6.2.1 Films Manager
- Upload new film: title, couple names, location, date, category (highlight/full), Firebase video upload, custom thumbnail upload
- Edit existing film metadata (title, description, tags)
- Delete film (removes from Firebase Storage + Firestore document)
- Reorder films via drag-and-drop
- Toggle visibility (draft / published)

### 📁 6.2.2 Client Albums Manager
- Create new album: client name, email, wedding date — system auto-generates unique UUID link
- Upload photos and videos to the album (bulk upload, Firebase)
- View album link + copy/share link
- Set watermark on/off per album
- View client comments and reactions (read-only in dashboard)
- Extend or revoke album access
- Delete album (removes Firebase Storage files + Firestore documents + Realtime DB entries)

### 💎 6.2.3 Packages Manager
- Create / edit / delete packages
- Fields: Package name, price, inclusions (list), badge label (e.g. Most Popular), display order
- Toggle package visibility

### ⭐ 6.2.4 Testimonials Manager
- Add / edit / delete testimonials
- Fields: Couple name, location, wedding date, testimonial text, star rating (1–5), couple photo (optional upload)
- Toggle visibility
- Sort order control

### 📬 6.2.5 Inquiries Inbox
- View all contact form submissions from Firestore
- Mark as read / unread / responded
- Filter by date, status
- Quick reply via WhatsApp deep link from the dashboard

### 🏠 6.2.6 Home Page Content Manager
- Update hero video/image and tagline text
- Select which films appear in the 'Featured Work' section
- Update stats (wedding count, cities, years)

## 6.3 Admin UI Design

- Admin uses a separate design system: dark but functional — not the same as the public site
- Sidebar navigation with icons for each section
- Mobile-friendly — admin should be operable from a phone
- Toast notifications for all actions (upload success, save, delete)

---

# 7. Firestore Collections Schema

## Collection: `films`

| Field | Type | Notes |
|---|---|---|
| `id` | string (auto doc ID) | Auto-generated |
| `title` | string | Film title |
| `couple_names` | string | |
| `location` | string | |
| `wedding_date` | Timestamp | |
| `category` | string | `highlight` \| `full_film` |
| `video_url` | string | Firebase Storage URL |
| `thumbnail_url` | string | Firebase Storage URL |
| `description` | string | SEO description |
| `is_published` | boolean | Default `false` |
| `display_order` | number | |
| `created_at` | Timestamp | |

## Collection: `client_albums`

| Field | Type | Notes |
|---|---|---|
| `id` | string (auto doc ID) | |
| `client_name` | string | |
| `client_email` | string | |
| `wedding_date` | Timestamp | |
| `album_uuid` | string | Unguessable UUID used in URL |
| `firebase_folder` | string | Path in Firebase Storage |
| `watermark_enabled` | boolean | |
| `share_token` | string | Temporary share UUID |
| `share_expires_at` | Timestamp | |
| `is_active` | boolean | |
| `created_at` | Timestamp | |

## Collection: `packages`

| Field | Type | Notes |
|---|---|---|
| `id` | string (auto doc ID) | |
| `name` | string | e.g. Gold |
| `price_label` | string | e.g. Starting ₹1,50,000 |
| `inclusions` | Array\<string\> | List of inclusions |
| `badge` | string | e.g. Most Popular |
| `display_order` | number | |
| `is_visible` | boolean | |
| `whatsapp_message` | string | Pre-fill template |

## Collection: `testimonials`

| Field | Type | Notes |
|---|---|---|
| `id` | string (auto doc ID) | |
| `couple_name` | string | |
| `location` | string | |
| `wedding_date` | Timestamp | |
| `testimonial_text` | string | |
| `star_rating` | number | 1–5 |
| `photo_url` | string | Optional Firebase URL |
| `is_visible` | boolean | |
| `display_order` | number | |

## Collection: `inquiries`

| Field | Type | Notes |
|---|---|---|
| `id` | string (auto doc ID) | |
| `full_name` | string | |
| `email` | string | |
| `phone` | string | |
| `wedding_date` | Timestamp | |
| `venue_city` | string | |
| `message` | string | |
| `source` | string | How they heard about us |
| `status` | string | `unread` \| `read` \| `responded` |
| `created_at` | Timestamp | |

---

# 8. Non-Functional Requirements

| Requirement | Target / Detail |
|---|---|
| Performance | LCP < 2.5s on 4G mobile, TTI < 4s |
| Uptime | 99.9% (Vercel SLA) |
| Mobile Responsiveness | Fully responsive — pixel-perfect on iPhone SE to iPad Pro |
| Accessibility | WCAG 2.1 AA — keyboard navigable, alt text, contrast ratios |
| Browser Support | Chrome 100+, Safari 15+, Firefox 100+, Edge 100+ |
| Security | HTTPS enforced, Firebase Security Rules on all collections and storage, no exposed API keys in client |
| Image Quality | Lossless originals in Firebase; WebP variants generated at upload time and served via Firebase Storage URLs with `loading="lazy"` on all `<img>` tags |
| Video Quality | Up to 4K source, adaptive streaming for mobile bandwidth |
| GDPR / Privacy | No tracking cookies without consent banner, contact data stored securely |
| Error Handling | Custom 404 and 500 pages, matching brand design |

---

# 9. Recommended Project File Structure

```
/
├── index.html                    # Home page
├── films.html                    # Films / video gallery page
├── packages.html                 # Packages + FAQ page
├── about.html                    # About Sagar page
├── testimonials.html             # Testimonials page
├── contact.html                  # Contact form page
├── album.html                    # Client album viewer (UUID read from URL query param)
│
├── admin/                        # Admin dashboard (auth-gated via Firebase Auth)
│   ├── login.html
│   ├── index.html                # Admin overview / home
│   ├── films.html
│   ├── albums.html
│   ├── packages.html
│   ├── testimonials.html
│   └── inquiries.html
│
├── css/
│   ├── main.css                  # Global styles, CSS variables, typography
│   ├── components.css            # Buttons, cards, modals, nav, footer
│   ├── animations.css            # Keyframes, transitions, scroll reveal
│   └── admin.css                 # Admin-specific design system
│
├── js/
│   ├── firebase.js               # Firebase app init — Firestore, Storage, Auth, Realtime DB
│   ├── firestore.js              # Firestore collection helpers and query utilities
│   ├── auth.js                   # Firebase Auth session management
│   ├── animations.js             # IntersectionObserver scroll reveals, GSAP init
│   ├── cursor.js                 # Custom cursor logic
│   ├── whatsapp.js               # WhatsApp link generators
│   └── pages/                   # Page-specific JS modules
│       ├── home.js
│       ├── films.js
│       ├── album.js
│       ├── packages.js
│       ├── contact.js
│       └── admin/
│           ├── films.js
│           ├── albums.js
│           ├── packages.js
│           ├── testimonials.js
│           └── inquiries.js
│
├── assets/
│   ├── fonts/                    # Self-hosted font fallbacks (optional)
│   ├── icons/                    # SVG icons / favicon
│   └── og/                      # Open Graph preview images
│
├── sitemap.xml                   # Hand-authored sitemap
└── robots.txt                   # Crawl rules
```

---

# 10. Decisions & Open Items

| Item | Decision Needed | Default / Recommendation |
|---|---|---|
| City for SEO targeting | Which city/cities to target in keywords? | Add to meta copy + JSON-LD |
| Package names & pricing | Confirm package tiers and pricing | Admin can update after launch |
| Instagram integration | Phase 1 or Phase 2? | Recommend Phase 2 |
| Video quality tiers | Upload 1080p or 4K as master? | Recommend 1080p master, Firebase serves |
| Album share link expiry | Should links expire or stay permanent? | Permanent — no expiry |
| Custom 404 page design | Brand video or static image? | Recommend short looping clip |
| Multi-language support | English only for now? | English only, Phase 2 optional |
| Blog / Journal section | For SEO value — Phase 2? | Yes, Phase 2 — Next.js MDX blog |

---

# 11. Glossary

| Term | Meaning |
|---|---|
| PRD | Product Requirement Document |
| SPA | Single Page Application — JS-driven page where content updates without full reload |
| UUID | Universally Unique Identifier — unguessable random string used as the client album access token in the URL |
| Security Rules | Firebase Security Rules — Firestore and Storage access control rules defined in the Firebase console |
| LCP | Largest Contentful Paint — Core Web Vital for load performance |
| CLS | Cumulative Layout Shift — Core Web Vital for visual stability |
| OG | Open Graph — social media preview meta tags (Facebook, WhatsApp) |
| JSON-LD | Structured data format for Google rich results / SEO |
| wa.me | WhatsApp Click-to-Chat URL format for pre-filled messages |
| CDN | Content Delivery Network — edge servers for fast global delivery |
| IntersectionObserver | Native browser API used to trigger scroll-reveal animations when elements enter the viewport |

---

*The Wed 24 — Confidential Product Document — v4.0 — March 2026*
