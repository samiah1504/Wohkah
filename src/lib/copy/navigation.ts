/**
 * Workspace navigation labels and page wording (PRODUCT_LANGUAGE_AND_POSITIONING.md §8).
 * Modules that aren't built yet are added here when their phase ships, never earlier.
 */
export const NAV = {
  home: { label: "Home" },
  staff: {
    label: "Staff",
    title: "Staff",
    description:
      "The people who work for your business. Active staff count toward your subscription.",
  },
  access: {
    label: "Team Access",
    title: "Team Access",
    description: "Your business staff who can sign in to WOHKAH, and what they can do.",
  },
  roles: {
    label: "Roles",
    title: "Roles and permissions",
    description: "Each person can have one or more roles. A role decides what they can see and do.",
  },
  settings: { label: "Settings", title: "Settings", description: "How your business is set up." },
  profile: { label: "Profile" },
} as const;
