---
name: Restohub POS
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#825100'
  on-tertiary: '#ffffff'
  tertiary-container: '#a36700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: DM Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: DM Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: DM Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-xl:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  numeric-hero:
    fontFamily: DM Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  numeric-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  numeric-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-lg: 1rem
  margin: 0.75rem
  margin-lg: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style
This design system is engineered for high-velocity, precision-demanding retail checkout environments. Operating at the intersection of ergonomics, rapid tactile feedback, and unwavering optical clarity, it caters to supermarket cashiers, supervisors, and self-checkout attendants working long shifts under intense overhead fluorescent lighting. 

The aesthetic is functional, crisp, and high-efficiency modernism with subtle tactile cues. The visual balance eliminates visual noise to preserve cashier focus and minimize scanning errors, while touch targets provide immediate physical confidence. Speed, precision, optical relief, and fail-safe feedback govern every layout decision.

## Colors
The palette is calibrated specifically for ambient supermarket lighting (cool, high-lumen, high-glare ceiling fixtures). 

- **Primary Canvas & Neutrals**: Backgrounds utilize `#F8FAFC` (App Canvas) and `#F1F5F9` (Card/Lane Panels), paired with deep slate `#0F172A` for text and structural lines. This delivers an ultra-high contrast ratio (>13:1) that prevents eye strain across multi-hour shifts. Secondary informational copy uses `#475569` and subtle borders use `#CBD5E1`.
- **Primary Action (Emerald Green `#059669` / Accent `#10B981`)**: Dedicated exclusively to forward-progress interactions: "Charge / Pay", tender completion, active scanner connectivity status, and successful barcode reads.
- **Secondary (Slate `#0F172A`)**: Applied to high-authority touch keys (numeric keypad, modal actions, administrative functions).
- **Warning & Discount (Amber `#F59E0B`)**: Designates line-item price overrides, active discounts, supervisor sign-offs required, and scale tare imbalances.
- **Critical & Void (Rose `#EF4444`)**: Reserved for void line items, cancelled transactions, hardware faults, and drawer-open alerts.

## Typography
Typographic discipline prioritizes legibility at arm's length (50–70cm viewing distances from standard register stands). 

- **Tabular Figures**: All numeric tiers (`numeric-hero`, `numeric-lg`, `numeric-md`, along with all body representations of currency, weights, tare units, and PLU codes) enforce the `tnum` (OpenType tabular figures) CSS property. This guarantees zero column jitter as prices tick upward during fast-paced scanning.
- **Hierarchy Split**: `DM Sans` supplies punchy, compact weights for order totals, keypad numerals, and modal headlines. `Inter` renders cart item descriptions, receipts, status pills, and system parameters with maximum glyph distinction (distinguishing `1`, `l`, `I`, `0`, and `O`).

## Layout & Spacing
Checkout terminals operate primarily on fixed 4:3 and 16:9 widescreen touch monitors (1024x768 up to 1920x1080), requiring a split-pane, viewport-locked layout with zero accidental canvas scroll.

- **Primary Split Layout (Landscape Touchscreen)**:
  - **Left Rail (38–42% width)**: Fixed-height "Receipt Tape" Cart. Top anchor contains cashier session and barcode status; scrollable middle contains scanned items; bottom sticky footer displays Subtotal, Tax, and prominent Total Due with full-width primary tender action.
  - **Right Area (58–62% width)**: Tabbed operational deck hosting the fast-key produce grid (PLU keys with photo cues), numeric touch keypad with quick-tender buttons, weight scale feed, and managerial function buttons.
- **Touch Targets**: Absolute minimum touch dimension is 48px by 48px; primary actions (Cash, Card, Enter, Total) range between 56px and 80px in height for rapid muscle-memory tapping.
- **Spacing Rhythm**: Dense, deliberate 4px/8px base spacing increments ensure dense information architecture without mutual tap interference.

## Elevation & Depth
Depth in this system avoids heavy, atmospheric drop shadows that introduce visual mud under harsh retail lighting. Instead, elevation is expressed through structured borders and crisp physical offsets:

- **Level 0 (App Canvas)**: Grounded `#F8FAFC`.
- **Level 1 (Panels & Cart Tape)**: Crisp `#FFFFFF` surface bounded by a continuous 1px solid border (`#E2E8F0`).
- **Level 2 (Fast-Key Tiles & Buttons)**: Surface `#FFFFFF` or semantic tint with a 1px perimeter outline and a subtle 1px downward tactile lip (`box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(15, 23, 42, 0.05)`).
- **Level 3 (Modals, Overrides, Tender Keypad Overlays)**: Surface `#FFFFFF`, bounded by 2px `#CBD5E1`, elevated with a structured drop shadow (`0 10px 25px -5px rgba(15, 23, 42, 0.15)`), accompanied by a dim 40% `#0F172A` backdrop scrim.
- **Active State (Tap/Press)**: Active buttons suppress the shadow and translate 1px downward to give immediate, unambiguous feedback during high-speed finger interaction.

## Shapes
A "Soft" roundedness (`0.25rem` / `4px` base to `0.5rem` / `8px` container radius) is maintained across all terminal components. 

Large, pill-shaped corners are deliberately avoided because they clip useful tactile tap territory on squarish POS grid layouts. Sharp corners (`0px`) are reserved only for receipt edge cut-lines and raw barcode strips. Buttons and product tiles use a standardized `6px` radius (`rounded-md`), balancing a modern aesthetic with maximum usable edge-to-edge hit surface.

## Components

### 1. Fast-Key Produce & Item Tiles
- **Structure**: 3 to 5 column responsive grid. Minimum size 88px x 88px.
- **Appearance**: Crisp `#FFFFFF` background, 1px `#E2E8F0` border, `rounded-md`. Features a 48px square produce thumbnail or color tag, bold item title (`label-md`), and high-visibility PLU code (`body-sm`, text-neutral).
- **Scale Indicators**: Items requiring scale weighing display an integrated scale icon badge in the top-right corner.

### 2. Receipt Tape (Scanned Item Cart)
- **Item Rows**: Alternate background row striping (`#FFFFFF` and `#F8FAFC`). Row height: 48px standard, 56px when expanded.
- **Content**: Left-aligned quantity, product title, and discount note (`#F59E0B`); right-aligned bold tabular price (`numeric-md`).
- **Void & Modifiers**: Voided items display a strike-through with an adjacent `#EF4444` tag. Swipe or dedicated tap reveals instant "Void", "+/-", and "Discount" controls.

### 3. Integrated Weight Scale Banner
- **Display**: High-contrast dock located adjacent to the numeric keypad.
- **Visuals**: Digital readout styling with dark `#0F172A` container, emerald `#10B981` numeric output (`numeric-hero`), displaying live gross weight, tare deduction, and calculated net weight (`lb` or `kg`).
- **Tare Button**: Integrated inline "Zero / Tare" button with warning amber border if unstable motion is detected.

### 4. Hardware & Barcode Status Pill
- **Placement**: Top status header bar.
- **State Display**: Green pulsing indicator dot for "Scanner Ready", amber for "Scale Calibrating / In Motion", and red for "Scanner Disconnected".

### 5. Quick Tender Shortcuts & Primary Checkout Bar
- **Fast Tender Keys**: Bank of horizontal 52px high buttons for instant tender: `[$20]`, `[$50]`, `[$100]`, `[Exact Cash]`, `[Credit/Debit]`.
- **Primary Checkout Button**: Massive, full-cart-width emerald button (`#059669`, hover/tap `#047857`, 64px height) displaying "Charge Total" with the total amount prominently set in bold tabular DM Sans.

### 6. Inputs & Numeric Touch Keypad
- **Numeric Pad**: 12-key array (`0-9`, `00`, `Clear`) with minimum 64px button heights. Bold 24px centered numbers.
- **Field Styling**: Prominent 48px input boxes with thick 2px active focus borders in Emerald `#059669` and clean right-aligned numerical entry.