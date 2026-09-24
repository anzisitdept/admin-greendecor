// Green Decor shared domain types (mirrors src/types/index.ts in the customer site),
// extended by addition for the admin data layer.

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: 'plants' | 'home-decor' | 'landscaping' | 'aquariums' | 'plant-care' | 'gift-pots';
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

export interface PromoSlide {
  id: string;
  title: string;
  kicker: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  badge?: string;
  bgGradient: string;
  imageUrl: string;
  active: boolean;
  order: number;
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
  id: string;
  userId?: string;
  items: CartItem[];
  shippingAddress: OrderAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed';
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
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

export type UserRole = 'admin' | 'staff' | 'customer';
export type UserStatus = 'active' | 'disabled';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  addresses: OrderAddress[];
  createdAt: string;
  lastLogin?: string;
}

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