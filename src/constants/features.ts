/**
 * In-app tips need an active Paid Applications Agreement: without it the App Store returns no products
 * and the tip page can only show an error (rejected under 2.1(b) for 1.0.1 build 9). Keep this off until
 * the agreement is Active, then turn it on in the build that submits the coffee tip product for review.
 */
export const tipsEnabled = false;
