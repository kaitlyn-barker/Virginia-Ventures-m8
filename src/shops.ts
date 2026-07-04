// ============================================================================
// shops.ts  -  CONTENT PACKS for "Boss for a Day".
// One ShopPack per business. Every per-shop WORD lives here: the owner, the
// questions, the answer buttons, the lessons, the outcome lines, the goals.
// The 3D look (colors, the case, the shelves, the owner figure) is handled in
// environment.ts, switched by the shop's id. NOTHING reads this file yet; it is
// the backbone the picker (Stage 2) and the panels (Stage 3) will plug into.
// To change any wording for any shop later, this is the one place to edit.
// ============================================================================

export type ShopId = "bakery" | "surf" | "repair";

// A generic three-option decision used by the Phase 4 beats: the midday supplier
// delay, the afternoon big-order capacity call, and each shop's unique twist.
// Each option carries its own meter nudges, cash effect, and feedback, so the
// whole decision - mechanic and words - lives in the shop pack. cash is dollars
// in (positive) or out (negative); best marks the strongest choice.
export interface ChoiceOption {
  label: string;
  fb: string;
  sat: number;
  profit: number;
  instinct: number;
  cash: number;
  best: boolean;
}
export interface ShopDecision {
  eyebrow: string;
  q: string;
  options: ChoiceOption[]; // exactly three
}

export interface ShopPack {
  id: ShopId;
  shopName: string;        // on the storefront sign and in the greeting
  subtitle: string;        // the line under "Boss for a Day" on the title card
  premise: string;         // the first welcome card: what today is
  ownerName: string;       // the owner who left you in charge
  ownerGreeting: string;   // the speech bubble above the owner

  // The 2D panel palette for this shop, used by the picker and Stage 3 panels.
  theme: {
    panelBg: string;
    panelBorder: string;
    ink: string;
    accent: string;
    accentInk: string;
    boxBg: string;
    boxBorder: string;
  };

  // The goal line in the corner at each handoff. Three of these name the owner.
  goals: {
    sayHi: string;
    morningCounter: string;
    middayFind: string;
    middayFloor: string;
    afternoonFind: string;
    closeCounter: string;
  };

  // Every owner question and every stage pick now carries its OWN feedback line,
  // so a wrong answer explains the tradeoff of THAT choice instead of a shared
  // "good guess." gusBScore/gusCScore rank the two non-best answers so a thoughtful
  // run scores higher than a careless one: the best answer earns full instinct,
  // a fair-but-flawed answer earns a little, a clearly poor answer earns none.
  morning: {
    gusQ: string; gusBest: string; gusB: string; gusC: string; gusLesson: string;
    gusBFb: string; gusCFb: string; gusBScore: number; gusCScore: number;
    priceQ: string; stockQ: string; readyText: string;
    priceP: string; priceF: string; priceB: string;
    stockFancy: string; stockMix: string; stockBulk: string;
    priceFbP: string; priceFbF: string; priceFbB: string;
    stockFbFancy: string; stockFbMix: string; stockFbBulk: string;
  };

  midday: {
    gusQ: string; gusBest: string; gusB: string; gusC: string; gusLesson: string;
    gusBFb: string; gusCFb: string; gusBScore: number; gusCScore: number;
    rivalQ: string; rivalHold: string; rivalMatch: string; rivalIgnore: string;
    compQ: string; compFree: string; compDiscount: string; compFirm: string;
    rivalFbHold: string; rivalFbMatch: string; rivalFbIgnore: string;
    compFbFree: string; compFbDiscount: string; compFbFirm: string;
    delay: ShopDecision; // Phase 4: a supplier delivery fails mid-rush
    doneText: string;
  };

  afternoon: {
    gusQ: string; gusBest: string; gusB: string; gusC: string; gusLesson: string;
    gusBFb: string; gusCFb: string; gusBScore: number; gusCScore: number;
    leftoverQ: string; leftDonate: string; leftMarkdown: string; leftToss: string;
    orderQ: string; orderP: string; orderF: string; orderFriendly: string;
    leftFbDonate: string; leftFbMarkdown: string; leftFbToss: string;
    orderFbP: string; orderFbF: string; orderFbFriendly: string;
    capacity: ShopDecision; // Phase 4: the big order vs. your walk-in customers
    doneText: string;
  };

  // Phase 4: one twist unique to this shop's market (perishable stock for the
  // bakery, weather for the surf shop, the fast-cheap-good triangle for repair).
  special: ShopDecision;

  // The MONEY side of the day. The dollar amounts themselves are shared and live
  // in ECONOMY (below), so the whole game balances from one place. What lives here
  // per shop is only the WORDS around money: the morning "spend to grow" choice
  // (a real scarcity / opportunity-cost decision - you can afford one, not both)
  // and the flavor labels on the between-stage sales ticks.
  economy: {
    oppQ: string;          // the framing line for the morning growth decision
    oppDealLabel: string;  // option A: the bulk-supply deal (saves money later)
    oppFlyerLabel: string; // option B: the ad flyer (draws a bigger crowd)
    oppDealNote: string;   // opportunity-cost callout shown after picking the deal
    oppFlyerNote: string;  // opportunity-cost callout shown after picking the flyer
    lunchRushLabel: string;     // e.g. "The lunch rush brought in"
    afternoonRushLabel: string; // e.g. "The afternoon crowd brought in"
  };
}

// ----------------------------------------------------------------------------
// ECONOMY - the one place the whole day is balanced. Every dollar amount lives
// here so a teacher (or a later phase) can retune the game without touching the
// stage logic. All three shops share these numbers; only the wording differs.
//
// The day: you open the register with startingCash, spend to stock and run the
// shop, and take in revenue on two "sales ticks" (lunch rush, afternoon crowd)
// whose size grows with your pricing and stocking choices. Net profit at close
// is simply money in minus money out.
// ----------------------------------------------------------------------------
export const ECONOMY = {
  startingCash: 150, // the register float you start the day with

  // MORNING opportunity-cost decision. Both growth moves cost the SAME, so the
  // lesson is purely "what did you give up?" - not "which number is bigger."
  oppCost: 60,        // price of the bulk deal OR the flyer (you can pick one)
  flyerBonus: 40,     // the flyer adds this to EACH sales tick (two rushes)
  bulkDealRebate: 70, // the deal pays back at close as lower supply costs

  // MORNING stocking - buying inventory is real cash out of the register.
  stockFancyCost: 55, // high-end stock costs the most up front
  stockMixCost: 45,
  stockBulkCost: 40,

  // Sales ticks. revenue = base x priceFactor x stockFactor (+ flyer if bought).
  lunchRushBase: 80,
  afternoonBase: 85,
  pricePremiumFactor: 1.2, // charge more, earn more per sale
  priceFairFactor: 1.1,
  priceBargainFactor: 1.0,
  stockFancyFactor: 1.18, // pricier stock sells for more
  stockMixFactor: 1.1,
  stockBulkFactor: 1.04,

  // MIDDAY cash events.
  rivalPromoCost: 12,   // the thank-you treat when you hold steady on price
  complaintFreeCost: 16, // the cost of a no-charge replacement

  // AFTERNOON cash events.
  leftoverMarkdownGain: 22, // marking down leftovers brings in a little cash
  orderDepositPremium: 60,  // deposit booked now on the big future order
  orderDepositFair: 45,
  orderDepositFriendly: 32,
};

// ----------------------------------------------------------------------------
// SHOP 1 - Sweet Capital Bakery (Cary Street, Richmond) - owner Ms. Delia
// ----------------------------------------------------------------------------
const BAKERY: ShopPack = {
  id: "bakery",
  shopName: "Sweet Capital Bakery",
  subtitle: "A Day at Sweet Capital Bakery",
  premise: "The owner of Sweet Capital Bakery, on Cary Street in Richmond, is taking the day off and left you in charge. For one day you will set prices, help customers, and make big calls to keep the shop thriving.",
  ownerName: "Ms. Delia",
  ownerGreeting: "Welcome to Sweet Capital Bakery! I'm Ms. Delia. The shop is yours today.",
  theme: {
    panelBg: "#f3e9d2", panelBorder: "#5b3a24", ink: "#5b3a24",
    accent: "#d98a8f", accentInk: "#5b3a24", boxBg: "#fdf3dd", boxBorder: "#e3a9a2",
  },
  goals: {
    sayHi: "Walk over and say hi to Ms. Delia.",
    morningCounter: "Now go to your counter to set your prices and stock.",
    middayFind: "The lunch rush is starting. Go find Ms. Delia.",
    middayFloor: "Now go to your shop floor and take care of the lunch rush.",
    afternoonFind: "The afternoon brings a big chance. Go find Ms. Delia.",
    closeCounter: "Now go to your counter to close out the day.",
  },
  morning: {
    gusQ: "A flour seller offers a giant pallet at a big discount, far more than we need for today. What is your call?",
    gusBest: "Buy a fair amount. Enough to save money, but not so much it sits unused.",
    gusB: "Grab the whole pallet! A discount is always worth it.",
    gusC: "Skip it, and just keep what we have.",
    gusLesson: "The discount only helps if you can really use it. A fair amount saves money without wasting flour or cash. Nice judgment.",
    gusBFb: "A discount you can't use isn't a savings. All that extra flour would go stale, and your cash is stuck on the shelf.",
    gusCFb: "Playing it safe is okay, but you walked past an easy way to save. A smaller order would have paid off.",
    gusBScore: 0,
    gusCScore: 4,
    priceQ: "How do you price the bakery's treats this morning?",
    stockQ: "What do you bake the most of today?",
    readyText: "Your prices are set and your cases are full. Time to open the doors!",
    priceP: "Premium prices. Charge a little more for top-quality treats.",
    priceF: "Fair prices. A solid deal for everyone.",
    priceB: "Bargain prices. Cheap treats bring big crowds.",
    stockFancy: "Fancy treats. High price, high reward.",
    stockMix: "A balanced mix of treats.",
    stockBulk: "Cheap treats in bulk. A crowd favorite.",
    priceFbP: "Premium means charging more. You earn the most per sale, but fewer people buy.",
    priceFbF: "Fair prices keep both your cash and your customers happy. A safe middle.",
    priceFbB: "Bargain prices pull a big crowd, but you earn only a little on each sale.",
    stockFbFancy: "Fancy treats cost more to make and sell for more. A big reward if they sell.",
    stockFbMix: "A balanced mix gives every customer something. Steady and safe.",
    stockFbBulk: "Cheap treats in bulk sell fast to a crowd, but each one earns just a little.",
  },
  midday: {
    gusQ: "A customer wants two dozen cupcakes boxed up in twenty minutes, right in the middle of the lunch rush. What do you do?",
    gusBest: "Take it, but be honest. Tell them it will be a few minutes so the rush stays smooth.",
    gusB: "Say yes and drop everything to box them all right now.",
    gusC: "Turn it down. You are too slammed to bother.",
    gusLesson: "Good instincts balance the order against the customers already in line. A clear, honest timeline wins both. That is the read to trust.",
    gusBFb: "Helping fast feels good, but dropping the whole line for one order leaves your other customers waiting and grumpy.",
    gusCFb: "Saying no keeps things calm, but you turned away good business. A quick, honest 'a few minutes, please' would have won both.",
    gusBScore: 4,
    gusCScore: 0,
    rivalQ: "A bakery on Cary Street just started a buy-one-get-one sale. What is your move?",
    rivalHold: "Hold steady, and add a small thank-you treat for regulars.",
    rivalMatch: "Slash your prices to beat their deal.",
    rivalIgnore: "Ignore it. Their deal is not your problem.",
    compQ: "A customer says the loaf they bought came out burnt. How do you handle it?",
    compFree: "Say sorry and swap it for a fresh loaf, no charge.",
    compDiscount: "Offer a small markdown on their next visit.",
    compFirm: "Tell them all sales are final.",
    rivalFbHold: "Holding your prices and thanking your regulars keeps you steady and builds loyalty. Smart.",
    rivalFbMatch: "Slashing (cutting) your prices to match starts a price war. You keep the crowd but earn far less on every sale.",
    rivalFbIgnore: "Ignoring the rival is calm, but a small thank-you for regulars would have kept them from wandering down the street.",
    compFbFree: "A free, fresh loaf costs a little now but turns an upset customer into a fan. Worth it.",
    compFbDiscount: "A markdown (lower price) on their next visit is fair and brings them back, but it does less to fix today's letdown.",
    compFbFirm: "'All sales are final' saves one loaf but loses a customer, and they will tell their friends.",
    delay: {
      eyebrow: "A DELIVERY FAILS",
      q: "Right in the rush, your flour delivery never shows up. You are running low. What do you do?",
      options: [
        { label: "Bake with what is on hand", fb: "Making do keeps the doors open, but the last-minute swap costs a little and regulars may notice the change.", sat: -2, profit: 0, instinct: 4, cash: -12, best: false },
        { label: "Tell customers, offer another treat", fb: "An honest heads-up and a good alternative keeps trust high. Customers respect a straight answer.", sat: 8, profit: 0, instinct: 8, cash: 0, best: true },
        { label: "Say nothing and hope", fb: "Hiding it works until you run out mid-order. Then the letdown is far worse than the truth would have been.", sat: -10, profit: 2, instinct: -4, cash: 0, best: false },
      ],
    },
    doneText: "The lunch rush is behind you. Word of how you handled it is already spreading.",
  },
  afternoon: {
    gusQ: "A planner wants a custom cake for a wedding at Maymont this weekend. It is the biggest order the bakery has ever had. What is your call?",
    gusBest: "Say yes, and block out time tomorrow so you can do it right.",
    gusB: "Say yes to every single thing they ask, right now, on top of today.",
    gusC: "Say no. It is too big a risk.",
    gusLesson: "The best chances are worth a yes, when you back it with a real plan to deliver. Confidence plus a plan is the instinct that grows a business.",
    gusBFb: "Saying yes to everything at once, on top of today, is how you burn out and drop the ball. Big chances need a plan, not a panic.",
    gusCFb: "Saying no is safe, but you turned down the biggest order the shop has ever seen. With a plan, you could have handled it.",
    gusBScore: 4,
    gusCScore: 0,
    leftoverQ: "It is closing time, and you have day-old bread and unsold pastries. What do you do?",
    leftDonate: "Donate the extra bread to a nearby shelter.",
    leftMarkdown: "Mark down the day's bakes so they sell fast.",
    leftToss: "Just pack it all away for tomorrow.",
    orderQ: "A cafe wants to book a standing order (the same order every week). How do you price it?",
    orderP: "Premium. A big weekly order is worth top dollar.",
    orderF: "A fair price for a big job.",
    orderFriendly: "A friendly rate to keep them coming back.",
    leftFbDonate: "Donating earns no cash, but it makes people proud of your shop and nothing goes to waste.",
    leftFbMarkdown: "A markdown (lower price) sells the leftovers fast and brings in a little cash before they go stale.",
    leftFbToss: "Packing day-old bread away means it just goes stale. You get nothing back for it.",
    orderFbP: "A premium price on a weekly order earns the most, but the cafe may shop around for a better deal.",
    orderFbF: "A fair price on a standing order (the same order every week) is steady money you can count on. A smart bet.",
    orderFbFriendly: "A friendly, low rate keeps the cafe loyal for years, but you leave a little money on the table each week.",
    capacity: {
      eyebrow: "A HUGE ORDER",
      q: "A caterer wants 200 cupcakes by 3pm - big money, but it will eat your whole afternoon. Your walk-in customers still need you. How much do you take on?",
      options: [
        { label: "Take the whole order", fb: "The big check is tempting, but tying up your whole afternoon leaves walk-in customers waiting - and some walk out.", sat: -12, profit: 6, instinct: -2, cash: 90, best: false },
        { label: "Take half, keep serving walk-ins", fb: "A slice of the big order AND caring for your regulars is the balanced call. Capacity is real - you cannot do it all.", sat: 2, profit: 4, instinct: 8, cash: 50, best: true },
        { label: "Turn it down, focus on today", fb: "Playing it safe keeps your regulars happy, but you left a big chance - and its cash - on the table.", sat: 6, profit: -2, instinct: 0, cash: 0, best: false },
      ],
    },
    doneText: "That is a wrap. Time to see how your day at the shop went.",
  },
  economy: {
    oppQ: "You have $150 to run the shop, and one big way to grow it. You can afford ONE of these today, not both.",
    oppDealLabel: "Take the bulk flour deal: spend $60 now to lower your baking costs all day.",
    oppFlyerLabel: "Buy an ad flyer: spend $60 to pull a bigger crowd to the bakery.",
    oppDealNote: "Opportunity cost: taking the deal means no flyer today. You traded a bigger crowd for lower supply costs.",
    oppFlyerNote: "Opportunity cost: the flyer means skipping the deal. You traded lower supply costs for a bigger crowd.",
    lunchRushLabel: "The lunch rush brought in",
    afternoonRushLabel: "The afternoon crowd brought in",
  },
  special: {
    eyebrow: "PERISHABLE STOCK",
    q: "Before you open: yesterday's unsold loaves are still good, but bread does not keep. What do you do with them?",
    options: [
      { label: "Sell them cheap up front", fb: "Selling day-old bread cheap clears it before it spoils and brings in a little cash. Perishable goods do not wait!", sat: 2, profit: 2, instinct: 6, cash: 18, best: true },
      { label: "Mix them in at full price", fb: "Passing day-old bread off as fresh saves nothing if customers notice. Trust is hard to win back.", sat: -8, profit: 4, instinct: 0, cash: 10, best: false },
      { label: "Toss them for a fresh look", fb: "A fresh-only case looks great, but you threw away good bread and the cash it could have earned. Ouch.", sat: 4, profit: -4, instinct: 0, cash: 0, best: false },
    ],
  },
};

// ----------------------------------------------------------------------------
// SHOP 2 - Atlantic Avenue Surf Co. (VB boardwalk) - owner Mr. Reyes
// ----------------------------------------------------------------------------
const SURF: ShopPack = {
  id: "surf",
  shopName: "Atlantic Avenue Surf Co.",
  subtitle: "A Day at Atlantic Avenue Surf Co.",
  premise: "The owner of Atlantic Avenue Surf Co., right on the Virginia Beach boardwalk, is taking the day off and left you in charge. For one day you will set prices, help customers, and make big calls to keep the shop riding high.",
  ownerName: "Mr. Reyes",
  ownerGreeting: "Welcome to Atlantic Avenue Surf Co.! I'm Mr. Reyes. The shop is yours today.",
  theme: {
    panelBg: "#e3f1f6", panelBorder: "#1e6f8e", ink: "#163f50",
    accent: "#2a8aa8", accentInk: "#ffffff", boxBg: "#d4e9f1", boxBorder: "#8fc4d6",
  },
  goals: {
    sayHi: "Walk over and say hi to Mr. Reyes.",
    morningCounter: "Now go to your counter to set your prices and stock.",
    middayFind: "The boardwalk rush is picking up. Go find Mr. Reyes.",
    middayFloor: "Now go to your shop floor and take care of the boardwalk rush.",
    afternoonFind: "The afternoon brings a big chance. Go find Mr. Reyes.",
    closeCounter: "Now go to your counter to close out the day.",
  },
  morning: {
    gusQ: "A supplier is offering a big crate of wetsuits at a deep discount, way more than we would rent this whole month. What is your call?",
    gusBest: "Buy a fair amount. Enough to save money, but not so many they sit in the back.",
    gusB: "Grab the whole crate! A discount is a discount.",
    gusC: "Skip it, and just keep what we have.",
    gusLesson: "Good instincts weigh the deal against what you will actually use. A fair amount saves money without tying up cash in gear that just sits. Nice read.",
    gusBFb: "A discount you can't use isn't a savings. All those extra wetsuits would sit in the back, and your cash is stuck on the rack.",
    gusCFb: "Playing it safe is okay, but you walked past an easy way to save. A smaller crate would have paid off.",
    gusBScore: 0,
    gusCScore: 4,
    priceQ: "How do you price your boards and gear this morning?",
    stockQ: "What do you stock the most of today?",
    readyText: "Your prices are set and your boards are racked. Time to open the doors!",
    priceP: "Premium prices. Charge a little more for top-quality boardwalk gear.",
    priceF: "Fair prices. A solid deal for every surfer.",
    priceB: "Bargain prices. Cheap rentals bring big crowds.",
    stockFancy: "High-end boards. High price, high reward.",
    stockMix: "A balanced mix of boards and gear.",
    stockBulk: "Cheap accessories in bulk. A crowd favorite.",
    priceFbP: "Premium means charging more. You earn the most per rental, but fewer people buy.",
    priceFbF: "Fair prices keep both your cash and your surfers happy. A safe middle.",
    priceFbB: "Bargain prices pull a big crowd, but you earn only a little on each rental.",
    stockFbFancy: "High-end boards cost more to stock and rent for more. A big reward if they go out.",
    stockFbMix: "A balanced mix of boards and gear gives every surfer something. Steady and safe.",
    stockFbBulk: "Cheap accessories in bulk sell fast to a crowd, but each one earns just a little.",
  },
  midday: {
    gusQ: "A camp counselor wants ten boards rented and ready in fifteen minutes, right in the middle of the rush. What do you do?",
    gusBest: "Take it, but be honest. Tell them it will be a few minutes so the rush stays smooth.",
    gusB: "Say yes and drop everything to rig all ten right now.",
    gusC: "Turn it down. You are too slammed to bother.",
    gusLesson: "Good instincts balance the big group against the customers already in line. A clear, honest timeline wins both. That is the read to trust.",
    gusBFb: "Helping fast feels good, but dropping the whole line for one group leaves your other customers waiting and grumpy.",
    gusCFb: "Saying no keeps things calm, but you turned away good business. A quick, honest 'a few minutes, please' would have won both.",
    gusBScore: 4,
    gusCScore: 0,
    rivalQ: "A shop further down the boardwalk just slashed its rental prices. What is your move?",
    rivalHold: "Hold steady, and toss in a free wax for regulars.",
    rivalMatch: "Slash your prices to beat their deal.",
    rivalIgnore: "Ignore it. Their deal is not your problem.",
    compQ: "A customer says the board they rented has a ding and took on water. How do you handle it?",
    compFree: "Say sorry and swap it for a fresh board, no charge.",
    compDiscount: "Offer a small discount on their next rental.",
    compFirm: "Tell them all rentals are final.",
    rivalFbHold: "Holding your prices and thanking your regulars keeps you steady and builds loyalty. Smart.",
    rivalFbMatch: "Slashing (cutting) your prices to match starts a price war. You keep the crowd but earn far less on every rental.",
    rivalFbIgnore: "Ignoring the rival is calm, but a free wax for regulars would have kept them from wandering down the boardwalk.",
    compFbFree: "A fresh board at no charge costs a little now but turns an upset customer into a fan. Worth it.",
    compFbDiscount: "A discount (lower price) on their next rental is fair and brings them back, but it does less to fix today's letdown.",
    compFbFirm: "'All rentals are final' saves one board but loses a customer, and they will tell their friends.",
    delay: {
      eyebrow: "A DELIVERY FAILS",
      q: "Right in the rush, your wetsuit shipment never shows up. You are running low. What do you do?",
      options: [
        { label: "Rent out the older wetsuits", fb: "Making do keeps surfers in the water, but the worn suits cost you a little and regulars may notice the swap.", sat: -2, profit: 0, instinct: 4, cash: -12, best: false },
        { label: "Tell surfers, offer a rash guard", fb: "An honest heads-up and a good alternative keeps trust high. Customers respect a straight answer.", sat: 8, profit: 0, instinct: 8, cash: 0, best: true },
        { label: "Say nothing and hope", fb: "Hiding it works until you run out mid-rush. Then the letdown is far worse than the truth would have been.", sat: -10, profit: 2, instinct: -4, cash: 0, best: false },
      ],
    },
    doneText: "The boardwalk rush is behind you. Word of how you handled it is already spreading.",
  },
  afternoon: {
    gusQ: "The East Coast Surfing Championships need a gear vendor for the weekend. It is the biggest order we have ever had. What is your call?",
    gusBest: "Say yes, and block out time tomorrow so you can do it right.",
    gusB: "Say yes to every single thing they ask, right now, on top of today.",
    gusC: "Say no. It is too big a risk.",
    gusLesson: "The best opportunities are worth a yes, when you back it with a real plan to deliver. Confidence plus a plan is the instinct that grows a business.",
    gusBFb: "Saying yes to everything at once, on top of today, is how you burn out and drop the ball. Big chances need a plan, not a panic.",
    gusCFb: "Saying no is safe, but you turned down the biggest order the shop has ever seen. With a plan, you could have handled it.",
    gusBScore: 4,
    gusCScore: 0,
    leftoverQ: "It is closing time, and you have rental boards back and unsold sunscreen. What do you do?",
    leftDonate: "Hand the extra sunscreen to the lifeguard stand.",
    leftMarkdown: "Mark down (lower the price on) the day's gear so it sells fast.",
    leftToss: "Just pack it all away for tomorrow.",
    orderQ: "A summer camp wants to book a group rental for next week (the same order every week). How do you price it?",
    orderP: "Premium. A big weekly order is worth top dollar.",
    orderF: "A fair price for a big booking.",
    orderFriendly: "A friendly rate to keep them coming back.",
    leftFbDonate: "Handing off the extra earns no cash, but it makes people proud of your shop and nothing goes to waste.",
    leftFbMarkdown: "A markdown (lower price) sells the leftover gear fast and brings in a little cash before the season ends.",
    leftFbToss: "Packing the gear away just leaves it sitting in the back. You get nothing back for it today.",
    orderFbP: "A premium price on a weekly rental earns the most, but the camp may shop around for a better deal.",
    orderFbF: "A fair price on a standing order (the same booking every week) is steady money you can count on. A smart bet.",
    orderFbFriendly: "A friendly, low rate keeps the camp loyal for years, but you leave a little money on the table each week.",
    capacity: {
      eyebrow: "A HUGE ORDER",
      q: "A beach resort wants 30 boards and wetsuits set up for a big event by 3pm - big money, but it will eat your whole afternoon. Your walk-in surfers still need you. How much do you take on?",
      options: [
        { label: "Take the whole order", fb: "The big check is tempting, but tying up your whole afternoon leaves walk-in surfers waiting - and some walk out.", sat: -12, profit: 6, instinct: -2, cash: 90, best: false },
        { label: "Take half, keep serving walk-ins", fb: "A slice of the big order AND caring for your regulars is the balanced call. Capacity is real - you cannot do it all.", sat: 2, profit: 4, instinct: 8, cash: 50, best: true },
        { label: "Turn it down, focus on today", fb: "Playing it safe keeps your regulars happy, but you left a big chance - and its cash - on the table.", sat: 6, profit: -2, instinct: 0, cash: 0, best: false },
      ],
    },
    doneText: "That is a wrap. Time to see how your day at the shop went.",
  },
  economy: {
    oppQ: "You have $150 to run the shop, and one big way to grow it. You can afford ONE of these today, not both.",
    oppDealLabel: "Take the bulk wetsuit deal: spend $60 now to lower your gear costs all day.",
    oppFlyerLabel: "Buy a boardwalk banner: spend $60 to pull a bigger crowd to the shop.",
    oppDealNote: "Opportunity cost: taking the deal means no banner today. You traded a bigger crowd for lower gear costs.",
    oppFlyerNote: "Opportunity cost: the banner means skipping the deal. You traded lower gear costs for a bigger crowd.",
    lunchRushLabel: "The boardwalk rush brought in",
    afternoonRushLabel: "The afternoon crowd brought in",
  },
  special: {
    eyebrow: "WEATHER WATCH",
    q: "The forecast is split: it could be a sunny beach day or a storm. You cannot control the weather, but you have to stock now. What do you do?",
    options: [
      { label: "Bet it all on sun", fb: "Stocking only boards and beach gear wins big if the sun comes out, but a storm leaves you stuck with gear no one wants. That is a real risk.", sat: 0, profit: 8, instinct: -2, cash: -10, best: false },
      { label: "Hedge: stock for sun or storm", fb: "A mix of boards AND wetsuits and indoor gear covers you either way. When demand rides on something you cannot control, hedging beats betting it all. Smart.", sat: 6, profit: 4, instinct: 8, cash: -8, best: true },
      { label: "Bet it all on storm", fb: "Stocking only wetsuits and rain gear wins if the storm hits, but a sunny day leaves you empty-handed for the beach crowd. Risky the other way.", sat: 0, profit: 2, instinct: -2, cash: -10, best: false },
    ],
  },
};

// ----------------------------------------------------------------------------
// SHOP 3 - Clarendon Device Repair (Arlington) - owner Ms. Okafor
// ----------------------------------------------------------------------------
const REPAIR: ShopPack = {
  id: "repair",
  shopName: "Clarendon Device Repair",
  subtitle: "A Day at Clarendon Device Repair",
  premise: "The owner of Clarendon Device Repair, in the heart of Arlington, is taking the day off and left you in charge. For one day you will set prices, help customers, and make big calls to keep the shop running.",
  ownerName: "Ms. Okafor",
  ownerGreeting: "Welcome to Clarendon Device Repair! I'm Ms. Okafor. The shop is yours today.",
  theme: {
    panelBg: "#e9edf1", panelBorder: "#445a72", ink: "#29384a",
    accent: "#46708c", accentInk: "#ffffff", boxBg: "#dce3ea", boxBorder: "#b3c2d0",
  },
  goals: {
    sayHi: "Walk over and say hi to Ms. Okafor.",
    morningCounter: "Now go to your counter to set your prices and focus.",
    middayFind: "The midday rush is picking up. Go find Ms. Okafor.",
    middayFloor: "Now go to your shop floor and take care of the midday rush.",
    afternoonFind: "The afternoon brings a big chance. Go find Ms. Okafor.",
    closeCounter: "Now go to your counter to close out the day.",
  },
  morning: {
    gusQ: "A parts supplier is offering a big lot of phone screens at a discount, far more than today's repairs need. What is your call?",
    gusBest: "Buy a fair amount. Enough to save money, but not a pile that sits on the shelf.",
    gusB: "Grab the whole lot! A discount is a discount.",
    gusC: "Skip it, and just order what today needs.",
    gusLesson: "Good instincts weigh the deal against what you will actually use. A fair amount saves money without tying up cash in parts that just sit. Nice read.",
    gusBFb: "A discount you can't use isn't a savings. All those extra screens would sit in a box, and your cash is stuck on the shelf.",
    gusCFb: "Playing it safe is okay, but you walked past an easy way to save. A smaller lot would have paid off.",
    gusBScore: 0,
    gusCScore: 4,
    priceQ: "How do you price your repairs this morning?",
    stockQ: "What do you focus on today?",
    readyText: "Your prices are set and your bench is ready. Time to open the doors!",
    priceP: "Premium prices. Charge a little more for expert, top-quality work.",
    priceF: "Fair prices. A solid deal for every customer.",
    priceB: "Bargain prices. Cheap fixes bring big crowds.",
    stockFancy: "Big laptop jobs. High price, high reward.",
    stockMix: "A balanced mix of repairs.",
    stockBulk: "Quick, cheap fixes in bulk. A crowd favorite.",
    priceFbP: "Premium means charging more. You earn the most per fix, but fewer people buy.",
    priceFbF: "Fair prices keep both your cash and your customers happy. A safe middle.",
    priceFbB: "Bargain prices pull a big crowd, but you earn only a little on each fix.",
    stockFbFancy: "Big laptop jobs cost more to take on and pay more. A big reward if they come in.",
    stockFbMix: "A balanced mix of repairs gives every customer something. Steady and safe.",
    stockFbBulk: "Quick, cheap fixes in bulk sell fast to a crowd, but each one earns just a little.",
  },
  midday: {
    gusQ: "A customer needs a cracked phone fixed in under an hour before a flight, right in the middle of the rush. What do you do?",
    gusBest: "Take it, but be honest. Tell them the real time it needs so the rush stays smooth.",
    gusB: "Say yes and drop every other repair to rush it now.",
    gusC: "Turn it down. You are too backed up to bother.",
    gusLesson: "Good instincts balance the rush job against the customers already waiting. A clear, honest timeline wins both. That is the read to trust.",
    gusBFb: "Helping fast feels good, but dropping every other repair for one job leaves your other customers waiting and grumpy.",
    gusCFb: "Saying no keeps things calm, but you turned away good business. A quick, honest 'a few minutes, please' would have won both.",
    gusBScore: 4,
    gusCScore: 0,
    rivalQ: "A mall kiosk nearby just dropped its repair prices. What is your move?",
    rivalHold: "Hold steady, and back your repairs with a free warranty.",
    rivalMatch: "Slash your prices to beat their deal.",
    rivalIgnore: "Ignore it. Their deal is not your problem.",
    compQ: "A customer says the screen you fixed yesterday is already flickering. How do you handle it?",
    compFree: "Say sorry and fix it again for free, right away.",
    compDiscount: "Offer a small discount on their next repair.",
    compFirm: "Tell them all repairs are final.",
    rivalFbHold: "Holding your prices and backing your work with a warranty keeps you steady and builds loyalty. Smart.",
    rivalFbMatch: "Slashing (cutting) your prices to match starts a price war. You keep the crowd but earn far less on every fix.",
    rivalFbIgnore: "Ignoring the rival is calm, but a free warranty for your customers would have kept them from wandering to the mall.",
    compFbFree: "A free re-fix costs a little now but turns an upset customer into a fan. Worth it.",
    compFbDiscount: "A discount (lower price) on their next repair is fair and brings them back, but it does less to fix today's letdown.",
    compFbFirm: "'All repairs are final' saves one job but loses a customer, and they will tell their friends.",
    delay: {
      eyebrow: "A DELIVERY FAILS",
      q: "Right in the rush, your screen parts shipment never shows up. You are running low. What do you do?",
      options: [
        { label: "Use a lower-grade part", fb: "Making do keeps repairs moving, but the off-brand part costs a little and customers may notice the difference.", sat: -2, profit: 0, instinct: 4, cash: -12, best: false },
        { label: "Tell customers, offer a loaner", fb: "An honest heads-up and a good alternative keeps trust high. Customers respect a straight answer.", sat: 8, profit: 0, instinct: 8, cash: 0, best: true },
        { label: "Say nothing and hope", fb: "Hiding it works until you run out mid-repair. Then the letdown is far worse than the truth would have been.", sat: -10, profit: 2, instinct: -4, cash: 0, best: false },
      ],
    },
    doneText: "The midday rush is behind you. Word of how you handled it is already spreading.",
  },
  afternoon: {
    gusQ: "A local school needs a whole cart of tablets repaired before Monday. It is the biggest order we have ever had. What is your call?",
    gusBest: "Say yes, and block out time tomorrow so you can do it right.",
    gusB: "Say yes to every single thing they ask, right now, on top of today.",
    gusC: "Say no. It is too big a risk.",
    gusLesson: "The best opportunities are worth a yes, when you back it with a real plan to deliver. Confidence plus a plan is the instinct that grows a business.",
    gusBFb: "Saying yes to everything at once, on top of today, is how you burn out and drop the ball. Big chances need a plan, not a panic.",
    gusCFb: "Saying no is safe, but you turned down the biggest order the shop has ever seen. With a plan, you could have handled it.",
    gusBScore: 4,
    gusCScore: 0,
    leftoverQ: "It is closing time, and you have spare parts and a few fixed-up devices. What do you do?",
    leftDonate: "Donate a refurbished tablet to the local library.",
    leftMarkdown: "Sell the refurbished devices at a markdown (lower price).",
    leftToss: "Just shelve them for tomorrow.",
    orderQ: "A company wants to book a batch of repairs for next week (the same order every week). How do you price it?",
    orderP: "Premium. A big weekly order is worth top dollar.",
    orderF: "A fair price for a big batch.",
    orderFriendly: "A friendly rate to keep them coming back.",
    leftFbDonate: "Donating a device earns no cash, but it makes people proud of your shop and nothing goes to waste.",
    leftFbMarkdown: "A markdown (lower price) sells the refurbished devices fast and brings in a little cash instead of leaving them on the shelf.",
    leftFbToss: "Shelving the devices means they just sit there. You get nothing back for them today.",
    orderFbP: "A premium price on a weekly batch earns the most, but the company may shop around for a better deal.",
    orderFbF: "A fair price on a standing order (the same batch every week) is steady money you can count on. A smart bet.",
    orderFbFriendly: "A friendly, low rate keeps the company loyal for years, but you leave a little money on the table each week.",
    capacity: {
      eyebrow: "A HUGE ORDER",
      q: "An office wants 40 laptops fixed by 3pm - big money, but it will eat your whole afternoon. Your walk-in customers still need you. How much do you take on?",
      options: [
        { label: "Take the whole order", fb: "The big check is tempting, but tying up your whole afternoon leaves walk-in customers waiting - and some walk out.", sat: -12, profit: 6, instinct: -2, cash: 90, best: false },
        { label: "Take half, keep serving walk-ins", fb: "A slice of the big order AND caring for your regulars is the balanced call. Capacity is real - you cannot do it all.", sat: 2, profit: 4, instinct: 8, cash: 50, best: true },
        { label: "Turn it down, focus on today", fb: "Playing it safe keeps your regulars happy, but you left a big chance - and its cash - on the table.", sat: 6, profit: -2, instinct: 0, cash: 0, best: false },
      ],
    },
    doneText: "That is a wrap. Time to see how your day at the shop went.",
  },
  economy: {
    oppQ: "You have $150 to run the shop, and one big way to grow it. You can afford ONE of these today, not both.",
    oppDealLabel: "Take the bulk parts deal: spend $60 now to lower your repair costs all day.",
    oppFlyerLabel: "Buy an ad flyer: spend $60 to pull more customers to the shop.",
    oppDealNote: "Opportunity cost: taking the deal means no flyer today. You traded more customers for lower parts costs.",
    oppFlyerNote: "Opportunity cost: the flyer means skipping the deal. You traded lower parts costs for more customers.",
    lunchRushLabel: "The midday walk-ins brought in",
    afternoonRushLabel: "The afternoon jobs brought in",
  },
  special: {
    eyebrow: "FAST, CHEAP, GOOD",
    q: "A customer wants a rush repair that is fast, cheap, AND perfect. You can only promise two of the three. Which two do you pick?",
    options: [
      { label: "Fast and good, not cheap", fb: "A speedy, top-quality fix makes the customer happy, but doing it right and fast costs you. You cannot also make it cheap.", sat: 6, profit: 4, instinct: 8, cash: 0, best: true },
      { label: "Fast and cheap, not good", fb: "Rushing a cut-rate job gets it out the door, but the quality slips and it may come back broken. Cheap and fast rarely means good.", sat: -8, profit: 2, instinct: 0, cash: 5, best: false },
      { label: "Cheap and good, not fast", fb: "A great fix at a fair price is a win, but the customer has to wait. You cannot also make it fast. Pick the two that matter most.", sat: 2, profit: -2, instinct: 2, cash: 0, best: false },
    ],
  },
};

// ----------------------------------------------------------------------------
// The pack registry, plus the "active shop" the picker will set in Stage 2.
// It defaults to the bakery so everything keeps working before the picker exists.
// ----------------------------------------------------------------------------
export const SHOPS: Record<ShopId, ShopPack> = {
  bakery: BAKERY,
  surf: SURF,
  repair: REPAIR,
};

export let activeShop: ShopPack = SHOPS.bakery;

export function setActiveShop(id: ShopId): void {
  activeShop = SHOPS[id];
}
