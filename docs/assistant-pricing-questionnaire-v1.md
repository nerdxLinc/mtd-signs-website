# MTD Website Assistant — Pricing & Intake Questionnaire (Draft 1)

**Status: For Barry's review. No prices are approved for publication yet.**

## Answers recorded — 24 November 2026 (confirmed by Barry)

These are direct answers from Barry about MTD. The assistant may use them as service descriptions, but must not infer pricing, availability, materials, or an installation commitment from them.

### Services MTD offers

- Flat-panel signs: aluminum composite material (**ACM**), PVC, plastic panels/sign faces, and corrugated plastic (**coroplast**) signs; yard signs
- Banners
- Cut lettering, decals, vehicle and truck lettering, window graphics, wall murals, and graphic applications to varied surfaces
- Partial and full commercial vehicle wraps, including trailer wraps
- Original logo and identity design, refreshing/refining existing logos, general graphic design, and design consultation
- Print products: business cards, letterhead, stationery, brochures, and other print media
- Apparel: T-shirts and caps featuring screen printing and/or embroidered emblems

**Service boundary:** MTD does **not** do electrical signs or **on-site sign installations**. Do not offer or quote MTD on-site installation labor. MTD may help facilitate an independent installer and provide general installation guidance, with details and provider to be confirmed by Barry.

**Clarification from Barry:** "No installation" is a **hard rule** for on-site sign installation, especially work involving ladders. Barry previously distinguished this from in-shop application of vehicle lettering and wraps. When customers need on-site installation, offer to pass along the request for help locating or coordinating an independent installer, and for advice on the installation approach. Never invent a specific installer or guarantee their work.

**Core product/service priorities reported by Barry** (six groupings when wraps are combined):

1. Logo design
2. Flat-panel signage, especially ACM
3. Partial and full commercial vehicle wraps
4. Vehicle lettering
5. Banners
6. Yard signs

**Still unapproved:** All prices, minimum charges, lead times, service areas, design revision rules, rush policies, discounts, artwork fees, installation charges, and payment terms.

### Pricing and design policies — public-safe working draft

The owner maintains the unapproved numeric rates separately from this **public repository**. Never place private pricing worksheets, supplier costs, or tentative rates in GitHub. The assistant is not permitted to quote prices.

| Product/service | Confirmed scope | Unresolved before public quotation |
| --- | --- | --- |
| ACM flat-panel signs | Priced using square footage, with a minimum charge | Clarify how area is rounded, one- vs. two-sided, material/print/lamination, artwork, mounting and pickup |
| New logo design | Includes the design, reasonable revisions, customer final approval, and basic ownership | Define "reasonable revisions," ownership/usage terms, deliverable files, and what counts as a brand-new concept |
| Existing logo refresh | Refine or refresh the existing logo, improving clarity, legibility, distinctiveness, and effectiveness as the customer's business identity | Define scope, pricing, included deliverables and revisions separately from new-logo design |
| Standalone commercial wrap design | Includes a mockup for review and customer artwork approval | Define what design/mockup covers and whether production/application are separate |
| Wrap design + logo development | May be **bundled** and quoted together rather than simply adding both design prices | No automatic math or fixed package price approved yet |
| Extended logo deliverables | Additional fees may apply for style guides, specialized formats, vector reconstruction and color separations | Which deliverables belong to the base package remains for Barry to decide |
| Preparation of customer-supplied AI artwork | May require paid interpretation and resizing | Keep the specifics between customer and Barry; do not engage in detailed artwork consultation through chat |

**Customer approval and wrap-design guarantee (confirmed):** Customers see and approve the artwork or design. For commercial wraps, MTD supplies a mockup for approval and guarantees that the finished graphics will **look like what the customer approved**. This is Barry's professional commitment. Do not weaken it into a vague resemblance claim, or turn it into a claim of pixel-for-pixel physical identity.

### Next interview: how pricing is calculated

1. **ACM panels:** Square-foot basis confirmed. What does the standard price include? How do you round dimensions or area?
2. **Logo design:** How many revision rounds and concepts are included? Which deliverables should be standard? How is logo *refresh* work priced differently?
3. **Vehicle wraps and lettering:** Is printing and in-shop application separately quoted? How is vehicle lettering priced? What is the combined-logo/wrap rule?
4. **Banners and yard signs:** Which standard sizes and quantities have repeatable prices? Do design, hemming/grommets, stakes, or other options change the price?
5. **Minimum job charge:** Is there one overall minimum or a separate minimum for different categories?

Until these have approved answers, the chatbot remains **human-quote-only**.

### Assistant conversation goal — confirmed by Barry

The assistant's **primary job is to refer interested prospects to Barry**. It should answer a couple of basic questions, gather one or two useful project details, then make it easy to send an inquiry. Do not turn the chatbot into a design consultant, artwork-preparation advisor, or prolonged quotation interview. Unapproved artwork-preparation fees remain outside this public repository.

### Requested next phase — telephone receptionist and text alerts

Barry would like an AI telephone receptionist that handles incoming business calls **only when he does not answer his Verizon phone**. It should answer a few basic service questions, offer to get Barry involved, collect a name, callback number and one-line project summary, and alert him via text message. Barry also receives many unsolicited sales pitches and suspicious inquiries: the assistant should avoid treating obvious vendor pitches or scam messages as customer leads. Filtering will be imperfect and should not permanently discard borderline inquiries.

**Verified routing mechanism:** Verizon supports conditional call forwarding for unanswered/busy calls (`*71` plus the destination number). That would route missed calls to a separate voice-service number instead of Verizon voicemail. **This is a requested future feature, not yet implemented or enabled.** No forwarding settings should be changed until Barry explicitly approves the target and voicemail behavior. A live transfer back to the same Verizon number may encounter the forwarding rule again, so prioritize a text alert and callback until a different reachable transfer destination is confirmed.

**Confirmed cost boundary:** Barry does not want Verizon Call Filter Plus or any other paid Verizon spam-blocking add-on. Free Verizon filtering is optional if already available. The proposed receptionist must not be represented as preventing the phone's initial ring. Obvious vendor solicitations, collection-related calls, and recognizable robocalls may be flagged without a lead alert, but retain a private review record rather than silently erasing them.

Questions to resolve before implementing any call routing, phone-number changes, or outbound SMS:

1. Which public MTD number currently rings Barry's Verizon phone? (Do not place personal routing numbers in this public repository.)
2. **Confirmed:** Answer only when Barry does not answer. Verify what he wants to happen if the phone is busy, as Verizon combines unanswered/busy call forwarding.
3. Which distinct number, if any, should be rung for live transfers? Which number should receive text alerts? (Keep personal routing numbers in private deployment secrets, not this repo.)
4. Should the caller be offered transfer immediately, or after one simple intake question? How long should the system try before offering callback?
5. What should happen when transfer fails, the assistant or provider is unavailable, or the caller refuses to speak with AI?
6. What recording/transcription disclosure and retention policy should apply, if any? Start without call recording unless explicitly approved.

Phone routing and SMS will require a telephony provider, configuration of call forwarding/number routing, and separate usage costs. The existing website chat endpoint alone does not answer voice calls. No automated callbacks, outbound marketing texts, appointment commitments, or phone changes are authorized by this request.

**Wrap/logo combination:** If a wrap also requires new logo design, Barry may combine the services in one custom quote. No fixed package formula is approved. **Separate clarification:** MTD also offers to update/refine existing logos; that is a distinct service, not an instruction to change a wrap/logo bundle price.

The first version of the assistant will **collect information and request a human quote**. We can later allow it to state fixed prices or carefully defined ranges for specific products, but only after you explicitly approve each rule.

Answer casually, in your own words. "Depends," "we don't offer that," and "let me think" are useful answers. We will refine this together rather than treating this as a one-time form.

## A. First, the business rules (highest priority)

**A1. What jobs do you actively WANT MTD to take?** Include any priorities, such as logo design, fleet lettering, commercial signs, or production-only jobs.

Answer: Logo design; flat-panel signage (especially ACM); partial and full commercial vehicle wraps; vehicle lettering; banners; yard signs. The broader offered-service catalog is recorded above. Which among these are *most desirable* given your goal of reducing physical work remains to be clarified.

**A2. What jobs should the assistant discourage, decline, or route elsewhere?** For example, full wraps, very small orders, rush installs, residential work, electrical signs, or repairs. These are examples to evaluate, *not* assumptions about your services.

Answer: **Electrical signs and on-site sign installation are not offered.** MTD may help customers locate or coordinate an independent installer and provide general advice on installation methods. In-shop vehicle wrap and lettering application was explicitly distinguished from on-site sign installation.

**A3. Which geographic areas will you serve?** Differentiate design/ship-only jobs, jobs requiring pickup, and jobs requiring installation. Any travel radius or minimum travel charge?

Answer:

**A4. What is the minimum worthwhile order?** Is there a general minimum charge, or does it depend on the product?

Answer:

**A5. What can the assistant say about scheduling?** Normal turnaround ranges, what counts as a rush, and any promises it must *never* make.

Answer:

**A6. How should a lead reach you?** Name/email required? Phone required? Should the assistant offer phone calls, email estimates, scheduled consultations, or all three?

Answer:

**A7. What are your policies for design and artwork?** File types, supplied-art quality, redesign fees, number of revisions, ownership of design files, and artwork approval before production.

Answer:

**A8. What are your deposit and payment rules?** When do you require deposits, what's due at completion, and which payment methods can you accept?

Answer:

**A9. What can the assistant disclose about prices?** Choose one for the initial launch:

- [ ] **Intake only:** no prices; Barry handles every quote (**recommended for launch**).
- [ ] **Published ranges:** assistant may share approved starting prices or ranges, clearly conditional.
- [ ] **Fixed-price products:** assistant may quote only explicitly approved standard items and options.

Your answer / exceptions:

**A10. How should the assistant identify itself?** For example, "I'm MTD's virtual assistant." What tone feels right, and when should it hand the conversation to you?

Answer:

## B. Your product-by-product pricing worksheet

For **each** service you want the agent to discuss, supply as much as applies. Skip irrelevant fields.

| Field | Your answer |
| --- | --- |
| Service / customer-facing product name | |
| Offered? (yes / no / ask Barry) | |
| How you charge (per item, sq. ft., linear ft., flat design fee, custom quote, etc.) | |
| **Customer-facing** base price or permitted range, if any | |
| Standard sizes, quantities, materials, and finish options | |
| Minimum order quantity or minimum charge | |
| Design or setup included? Additional fees? | |
| Installation included, separate, or not offered? | |
| Quantity discounts or other price-break rules | |
| Typical lead time (only if safe to tell customers) | |
| Information needed before estimating | |
| Situations that require your review | |
| Exact wording / exclusions / caveats | |
| **Approved for the assistant to quote? (yes / no)** | |

Start with the services you most want to sell. The site currently names these broad categories, which are **not** a confirmed price list:

1. Vehicle wraps and fleet graphics
2. Logo and identity design
3. Commercial signage
4. Church and ministry graphics
5. Public safety graphics
6. Specialty projects

You may want to break these down into actual purchasable items (for example, a 3×8 banner, a pair of truck-door decals, a yard sign, or an hourly design service) and omit categories that don't have repeatable pricing.

## C. Questions the assistant should ask customers

Which of these should be required, optional, or irrelevant for each service?

- What are you wanting made? What is it for?
- How many do you need?
- What dimensions, material, or surface are involved?
- Is this a new design, a reprint, or an update to existing artwork?
- Do you already have a usable logo or production-ready artwork?
- For vehicles: make/model/year, number of vehicles, exact panel coverage, existing graphics, and photos?
- Is installation needed? Where would it take place?
- When do you need the finished job?
- Name, email, and preferred phone number?
- Do you have photos, sketches, or reference examples?
- Any other critical question specific to your business?

Answer / corrections:

## D. Exceptions and boundaries

**D1. When must the assistant stop estimating and refer to you?** (Unusual surfaces, old wrap removal, vehicle damage, permitting, electrical work, difficult site access, unapproved materials, etc.)

Answer:

**D2. Can it offer a ballpark figure, and if so, for which *exact* cases?** If the answer is "no," that's fine.

Answer:

**D3. Should it refer leads to another business when you don't offer the service?** If yes, only provide approved referral names.

Answer:

**D4. Anything you never want it to promise or say?** Consider instant availability, free design, exact turnaround, warranties, price matching, and guaranteed installation dates.

Answer:

## E. Sample conversations (we will test these together)

Once you've reviewed the above, we'll check its responses to at least these situations:

1. "How much for two truck-door logos?"
2. "I want a full wrap on my van. Can you have it done Friday?"
3. "I have a logo. Can you make one 3×8 banner?"
4. "What's the cheapest sign you make?"
5. "Can I send you a photo and get an exact quote?"
6. "Do you install electrical monument signs?"
7. "I want ten signs but I'm outside your normal service area."
8. A salesperson trying to use the chatbot to pitch MTD something.

**Approval rule:** No price, date, discount, technical specification, or policy moves into the live assistant until you have approved it. We keep the original questionnaire and version subsequent decisions so a later change is easy to trace and reverse.
