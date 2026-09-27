// Green Decor shared domain types (mirrors src/types/index.ts in the customer site),
// extended by addition for the admin data layer.

/**
 * Slugs for the shop categories, mirroring the documents in the `categories`
 * collection. The collection is the live source of truth; this union only
 * constrains what the admin form will write, so a category that only exists in
 * Firestore still needs to be added here before the form can save it.
 */
export const PRODUCT_CATEGORY_IDS = [
  'aquarium',
  'candles',
  'pots',
  'wall-hangings',
  'chemicals',
  'other',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORY_IDS)[number];

export interface ProductCategoryDoc {
  id: ProductCategory;
  label: string;
  order: number;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  categoryLabel: string;
  price: number;
  salePrice?: number;
  images: string[];
  stock: number;
  rating: number;
  reviewCount: number;
  shortDescription: string;
  description: string;
  careInstructions?: {
    sunlight: string;
    water: string;
    difficulty: 'Easy' | 'Moderate' | 'Expert';
    petFriendly: boolean;
    indoor: boolean;
  };
  details?: {
    height?: string;
    potSize?: string;
    material?: string;
    origin?: string;
  };
  tags: string[];
  featured?: boolean;
  isNew?: boolean;
  inStock: boolean;
}

export interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  heroImage: string;
  icon: string;
  gallery: string[];
  features: string[];
  pricingRange: string;
  benefits: { title: string; desc: string }[];
  process: { step: number; title: string; desc: string }[];
  faqs: { question: string; answer: string }[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  city: string;
  quote: string;
  rating: number;
  photoUrl: string;
  image?: string; // Optional plant/product image for split cards
  serviceOrProduct: string;
  featured?: boolean;
  approved?: boolean;
}

export type ReviewType = 'private' | 'general';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

/**
 * Customer reviews submitted from the public site (testimonials + product
 * pages). General + approved reviews are shown publicly; private reviews are
 * only visible to staff for feedback.
 */
export interface ProductReview {
  id: string;
  productId?: string;
  productSlug?: string;
  authorName: string;
  rating: number;
  text: string;
  type: ReviewType;
  status: ReviewStatus;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedOption?: string;
}

export interface OrderAddress {
  fullName: string;
  phone: string;
  email: string;
  streetAddress: string;
  apartmentSuite?: string;
  city: string;
  province: string;
  postalCode?: string;
  notes?: string;
}

export type PaymentMethod = 'cod' | 'jazzcash' | 'easypaisa' | 'bank_transfer';

export type OrderStatus = 'placed' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
];

export interface Order {
  /** Customer-facing order number, e.g. `GD-49371`. NOT the document id. */
  id: string;
  /** Real Firestore document id (orders are created with `addDoc`). */
  docId?: string;
  userId?: string;
  items: CartItem[];
  shippingAddress: OrderAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed';
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  promoCode?: string;
  status: OrderStatus;
  trackingNumber: string;
  createdAt: string;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note: string;
  }[];
}

export type ServiceRequestStatus = 'new' | 'contacted' | 'consultation_scheduled' | 'completed';

export interface ServiceRequest {
  id: string;
  serviceSlug: string;
  serviceTitle: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  propertyType: 'Residential' | 'Commercial' | 'Office' | 'Balcony / Terrace' | 'Other';
  budget?: string;
  message: string;
  createdAt: string;
  status: ServiceRequestStatus;
}

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'disabled';

/**
 * How a record got into `users`.
 * - `registration` — signed up through the storefront (keyed by auth uid)
 * - `welcome-popup` — claimed a welcome code without an account (keyed by
 *   normalised contact), so there is no `uid` and no `addresses`
 */
export type UserSource = 'registration' | 'welcome-popup' | 'admin-created' | string;

export interface UserProfile {
  /** Firestore document id. Equals `uid` for accounts, normalised contact for
   *  welcome signups. Always prefer this over the `uid` field when writing. */
  id?: string;
  uid?: string;
  name: string;
  /** Absent for phone-keyed accounts. Kept for legacy welcome records. */
  email?: string;
  /** Normalised E.164 form, e.g. `923001234567`. The account's identity. */
  phone?: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  addresses: OrderAddress[];
  createdAt: string;
  lastLogin?: string;
  source?: UserSource;
  /** Welcome coupon this person claimed, if any. */
  welcomeCode?: string;
  welcomeClaimedAt?: string;
}

/**
 * How a coupon came into existence. `welcome-popup` coupons are minted
 * server-side by the storefront's welcome-coupon endpoint and carry the
 * visitor's claim metadata below; `manual` coupons are typed in by staff.
 */
export type CouponSource = 'welcome-popup' | 'manual' | 'campaign';

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  minOrder: number;
  active: boolean;
  usageLimit?: number;
  usedCount: number;
  expiresAt?: string;
  createdAt: string;
  /** Claim metadata. The cart ignores these; the admin UI lists them. */
  source?: CouponSource | string;
  /**
   * @deprecated Never write these. `coupons` is world-readable, so claimant PII
   * would be public. Read `welcomeSubscribers` by `code` instead. Kept only so
   * legacy documents that still carry them remain type-compatible.
   */
  contact?: string;
  /** @deprecated See {@link Coupon.contact}. */
  email?: string;
  note?: string;
  claimedAt?: string;
}

export type WelcomeSubscriberStatus = 'active' | 'used' | 'expired';

/**
 * One document per subscriber, keyed by `contact` (normalised digits with a
 * leading 92) so a visitor who submits twice reuses the original record.
 *
 * The collection carries two kinds of record: a welcome-popup claim, which also
 * holds the coupon `code` it was issued, and a plain footer newsletter signup,
 * which has no code at all. `newsletter` distinguishes the latter.
 */
export interface WelcomeSubscriber {
  id: string;
  contact: string;
  email?: string;
  code?: string;
  status: WelcomeSubscriberStatus;
  source?: string;
  /** Set when the record came from the footer newsletter form. */
  newsletter?: boolean;
  ipHash?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'new' | 'read' | 'replied';
}

export interface SiteSettings {
  whatsappNumber: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  workingHours: string;
  shippingFreeThreshold: number;
  shippingFlatFee: number;
  currencyLabel: string;
  deliveryCities: string[];
  supportedProvinces: string[];
}

export interface HeroSlide {
  title: string;
  subtitle: string;
  image: string;
  wallScript?: string;
  badge?: string;
}

export interface TrustBarStat {
  number: string;
  label: string;
}

export interface SiteContent {
  heroSlides: HeroSlide[];
  purpose: {
    heading: string;
    subcopy: string;
    pillars: { label: string; icon: string }[];
    quote: string;
  };
  trustBar: {
    stats: TrustBarStat[];
    note: string;
  };
  servicesGrid: {
    heading: string;
    subcopy: string;
    serviceIds: string[];
  };
  footer: {
    about: string;
    hours: string;
    credits: string;
  };
}

export interface SiteContentDoc {
  id: string;
  published: boolean;
  updatedAt: string;
  content: SiteContent;
}