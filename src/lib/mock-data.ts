export type Coach = {
  slug: string;
  name: string;
  subtitle: string;
  headline: string;
  rating: number;
  reviews: number;
  sessions: number;
  rate: number;
  years: number;
  photo: string;
  hero: string;
  video: string;
  locations: string[];
  specializations: string[];
  certifications: string[];
  verified: boolean;
  weekendSlots: number;
  bio: string;
  slots: Record<string, string[]>;
};

// Premium Unsplash court image — dramatic hard court, works as both
// the landing splash background and the in-app hero card
export const courtImage =
  "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=1920&q=90&auto=format&fit=crop";

export const coaches: Coach[] = [
  {
    slug: "emeka-okonkwo",
    name: "Emeka Okonkwo",
    subtitle: "ITF Certified",
    headline: "ITF Certified · VI & Lekki",
    rating: 4.9,
    reviews: 47,
    sessions: 127,
    rate: 20000,
    years: 8,
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&q=85&auto=format&fit=crop&crop=faces",
    hero:
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=85&auto=format&fit=crop",
    video:
      "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=85&auto=format&fit=crop",
    locations: ["Lekki", "VI", "Ikoyi"],
    specializations: ["Beginners", "Adults", "Kids"],
    certifications: ["ITF Level 2 Certified", "PTCAN Member"],
    verified: true,
    weekendSlots: 3,
    bio: "Emeka has been coaching tennis in Lagos for 8 years, working with players at every level from complete beginners to competitive club players. His sessions focus on footwork, clean contact, and practical match confidence.",
    slots: { "Thu 15": ["7:00 AM", "8:00 AM", "5:00 PM", "6:00 PM"], "Sat 17": ["9:00 AM", "4:00 PM"] },
  },
  {
    slug: "amaka-eze",
    name: "Amaka Eze",
    subtitle: "Beginner Specialist",
    headline: "Beginners · Lekki",
    rating: 4.8,
    reviews: 31,
    sessions: 84,
    rate: 18000,
    years: 5,
    photo:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&q=85&auto=format&fit=crop&crop=faces",
    hero:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=85&auto=format&fit=crop&crop=faces",
    video:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=85&auto=format&fit=crop&crop=faces",
    locations: ["Lekki", "Ajah"],
    specializations: ["Beginners", "Kids"],
    certifications: ["PTR Certified"],
    verified: true,
    weekendSlots: 2,
    bio: "Amaka helps new players build strong fundamentals without pressure. Her lessons are calm, structured, and especially good for adults starting tennis for the first time.",
    slots: { "Fri 16": ["8:00 AM", "6:00 PM"], "Sat 17": ["10:00 AM"] },
  },
  {
    slug: "tayo-balogun",
    name: "Tayo Balogun",
    subtitle: "Former Pro Player",
    headline: "Advanced · Ikoyi",
    rating: 4.9,
    reviews: 62,
    sessions: 112,
    rate: 25000,
    years: 10,
    photo:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&q=85&auto=format&fit=crop&crop=faces",
    hero:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=85&auto=format&fit=crop&crop=faces",
    video:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=85&auto=format&fit=crop&crop=faces",
    locations: ["Ikoyi", "VI"],
    specializations: ["Competitive", "Adults"],
    certifications: ["Former ATP Futures Player"],
    verified: true,
    weekendSlots: 1,
    bio: "Tayo works with competitive adults and junior players who want sharper point construction, higher intensity drills, and match-play discipline.",
    slots: { "Thu 15": ["7:00 AM", "5:00 PM"], "Sun 18": ["8:00 AM"] },
  },
];

export function getCoach(slug: string) {
  return coaches.find((coach) => coach.slug === slug) || coaches[0];
}

export function money(value: number) {
  return `₦${value.toLocaleString()}`;
}

export const bookingDays = [
  { key: "Mon 12", weekday: "Mon", day: "12", full: "Monday, 12 May", short: "Mon 12 May" },
  { key: "Tue 13", weekday: "Tue", day: "13", full: "Tuesday, 13 May", short: "Tue 13 May" },
  { key: "Wed 14", weekday: "Wed", day: "14", full: "Wednesday, 14 May", short: "Wed 14 May" },
  { key: "Thu 15", weekday: "Thu", day: "15", full: "Thursday, 15 May", short: "Thu 15 May" },
  { key: "Fri 16", weekday: "Fri", day: "16", full: "Friday, 16 May", short: "Fri 16 May" },
  { key: "Sat 17", weekday: "Sat", day: "17", full: "Saturday, 17 May", short: "Sat 17 May" },
  { key: "Sun 18", weekday: "Sun", day: "18", full: "Sunday, 18 May", short: "Sun 18 May" },
];

export function getBookingDay(key: string) {
  return bookingDays.find((day) => day.key === key) || bookingDays[3];
}

export function getSessionEndTime(start: string) {
  const match = start.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);
  if (!match) return "8:00 AM";

  const [, hourText, minuteText, meridiem] = match;
  let hour = Number(hourText);
  const minute = Number(minuteText);
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  const end = new Date(2026, 4, 15, hour, minute);
  end.setHours(end.getHours() + 1);
  const endHour24 = end.getHours();
  const endHour = endHour24 % 12 || 12;
  const endMeridiem = endHour24 >= 12 ? "PM" : "AM";

  return `${endHour}:${String(end.getMinutes()).padStart(2, "0")} ${endMeridiem}`;
}

export type PlayerBooking = {
  id: string;
  coachSlug: string;
  day: string;
  time: string;
  durationMinutes: number;
  location?: string;
  note?: string;
  status: "confirmed" | "completed";
  reviewed: boolean;
  sessionFee: number;
  lobbFee: number;
  total: number;
  reference: string;
  cancellationCutoff: string;
};

export const playerBookings: PlayerBooking[] = [
  {
    id: "lobb-2405-0042",
    coachSlug: "emeka-okonkwo",
    day: "Thu 15",
    time: "7:00 AM",
    durationMinutes: 60,
    location: "Lagos Country Club",
    note: "Complete beginner, working on basics.",
    status: "confirmed",
    reviewed: false,
    sessionFee: 20000,
    lobbFee: 1000,
    total: 21000,
    reference: "LOBB-2405-0042",
    cancellationCutoff: "Wed 14 May 7:00 AM",
  },
  {
    id: "lobb-2405-0019",
    coachSlug: "amaka-eze",
    day: "Mon 6",
    time: "8:00 AM",
    durationMinutes: 60,
    status: "completed",
    reviewed: false,
    sessionFee: 18000,
    lobbFee: 900,
    total: 18900,
    reference: "LOBB-2405-0019",
    cancellationCutoff: "Sun 5 May 8:00 AM",
  },
];

export function getPlayerBooking(id: string) {
  return playerBookings.find((booking) => booking.id === id) || playerBookings[0];
}

export type CoachBooking = {
  id: string;
  playerName: string;
  playerShortName: string;
  playerPhone: string;
  playerAvatar: string;
  day: string;
  time: string;
  location: string;
  note?: string;
  status: "confirmed" | "completed" | "cancelled";
  amount: number;
};

export const coachBookings: CoachBooking[] = [
  {
    id: "coach-booking-0042",
    playerName: "Tunde Adeyemi",
    playerShortName: "Tunde A.",
    playerPhone: "0812 345 6789",
    playerAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&h=240&q=85&auto=format&fit=crop&crop=faces",
    day: "Thu 15",
    time: "7:00 AM",
    location: "Lagos Country Club",
    note: "Complete beginner",
    status: "confirmed",
    amount: 20000,
  },
  {
    id: "coach-booking-0043",
    playerName: "Chioma Okoro",
    playerShortName: "Chioma O.",
    playerPhone: "0809 112 4567",
    playerAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&h=240&q=85&auto=format&fit=crop&crop=faces",
    day: "Fri 16",
    time: "9:00 AM",
    location: "Ikoyi Club 1938",
    status: "confirmed",
    amount: 20000,
  },
  {
    id: "coach-booking-0031",
    playerName: "Femi Balogun",
    playerShortName: "Femi B.",
    playerPhone: "0810 552 7731",
    playerAvatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&h=240&q=85&auto=format&fit=crop&crop=faces",
    day: "Mon 12",
    time: "5:00 PM",
    location: "Lekki Phase 1 courts",
    status: "completed",
    amount: 20000,
  },
  {
    id: "coach-booking-0028",
    playerName: "Sarah Johnson",
    playerShortName: "Sarah J.",
    playerPhone: "0805 442 1980",
    playerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&q=85&auto=format&fit=crop&crop=faces",
    day: "Tue 13",
    time: "8:00 AM",
    location: "Victoria Island courts",
    status: "cancelled",
    amount: 20000,
  },
];

export function getCoachBooking(id: string) {
  return coachBookings.find((booking) => booking.id === id) || coachBookings[0];
}

export const adminStats = {
  activeCoaches: 24,
  totalGmv: 480000,
  totalBookings: 47,
  pendingApprovals: 3,
};

export const adminCoachApprovals = [
  {
    slug: "emeka-okonkwo",
    name: "Emeka Okonkwo",
    submitted: "2hrs ago",
    headline: "ITF Certified",
    locations: "Lekki, VI",
    rate: 20000,
    certifications: "ITF L2",
    photo: coaches[0].photo,
    videoUrl: coaches[0].video,
  },
  {
    slug: "amaka-eze",
    name: "Amaka Eze",
    submitted: "5hrs ago",
    headline: "Beginner Specialist",
    locations: "Lekki, Ajah",
    rate: 18000,
    certifications: "PTR Certified",
    photo: coaches[1].photo,
    videoUrl: coaches[1].video,
  },
  {
    slug: "tayo-balogun",
    name: "Tayo Balogun",
    submitted: "1 day ago",
    headline: "Former Pro Player",
    locations: "Ikoyi, VI",
    rate: 25000,
    certifications: "Former ATP Futures",
    photo: coaches[2].photo,
    videoUrl: coaches[2].video,
  },
];

export type AdminBookingStatus = "confirmed" | "completed" | "disputed" | "cancelled";

export type AdminBooking = {
  id: string;
  date: string;
  coach: string;
  player: string;
  amount: number;
  status: AdminBookingStatus;
};

export const adminBookings: AdminBooking[] = [
  { id: "LOBB-2405-0042", date: "Thu 15 May · 7AM", coach: "Emeka", player: "Tunde", amount: 21000, status: "confirmed" },
  { id: "LOBB-2405-0039", date: "Wed 14 May · 4PM", coach: "Amaka", player: "Sarah", amount: 15500, status: "completed" },
  { id: "LOBB-2405-0031", date: "Mon 12 May · 8AM", coach: "Tayo", player: "Daniel", amount: 21000, status: "cancelled" },
  { id: "LOBB-2405-0028", date: "Sun 11 May · 10AM", coach: "Janet", player: "Tunde", amount: 32000, status: "disputed" },
  { id: "LOBB-2405-0022", date: "Sat 10 May · 5PM", coach: "Ben", player: "Liam", amount: 18000, status: "completed" },
];
