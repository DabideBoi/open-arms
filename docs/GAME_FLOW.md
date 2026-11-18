# Open Arms — Game Flow

Open Arms is a shelter-management game. You build and run a shelter, take in people in need, keep them healthy, and help them rebuild their lives until they are ready to leave: **reintegration**. Money and reputation are the two resources that keep the shelter alive.

The diagrams below go from the big picture down to the details:

1. [Session flow](#1-session-flow)
2. [Core loop: day and night](#2-core-loop-day-and-night)
3. [Player actions and outcomes](#3-player-actions-and-outcomes)
4. [Resident lifecycle](#4-resident-lifecycle)
5. [Events and choices](#5-events-and-choices)
6. [Progression and fail states](#6-progression-and-fail-states)

**Legend:** solid arrows are working gameplay. Dashed arrows (`-.->`) are designed features that are not yet wired into the game (see [Not yet wired in](#not-yet-wired-in)). Money is in pesos (₱). "Rep" means reputation (0–100).

---

## The whole game at a glance

All six charts below, combined into one diagram. Each numbered box is a condensed version of its section. The arrows between boxes show how the parts of the game feed each other.

```mermaid
flowchart TD
    subgraph SESSION["1 · Session"]
        s_launch["Launch"] --> s_first{"First time?"}
        s_first -- Yes --> s_tut["Tutorial"]
        s_first -- No --> s_play
        s_tut --> s_play["Playing"]
        s_play -- "Space" --> s_pause["Paused"]
        s_pause -- "Resume" --> s_play
        s_play --> s_settings["Settings<br/>save / load slots"]
        s_settings --> s_play
        s_fresh["New shelter<br/>₱250k, 3 residents<br/>on reset or Restart"] --> s_play
    end

    subgraph LOOP["2 · Day / Night loop"]
        d_day["☀ Day · 4 min<br/>rooms open, residents meet needs"] -- "Dusk" --> d_night["☾ Night · 2 min<br/>residents sleep, some rooms close,<br/>no fundraisers or demolishing"]
        d_night -- "Dawn" --> d_dawn["Dawn bills<br/>operating costs + food bill<br/>Rep drifts down, sleepers +30 health"]
        d_dawn -- "New day" --> d_day
        d_bg["Always running<br/>donations every 90 s · maintenance every 5 min<br/>random events every 1–3 min · warnings"]
    end

    subgraph ACTIONS["3 · Player actions"]
        a_player(("Player"))
        a_player --> a_build["Build rooms<br/>dorms, food, health, social, decor"]
        a_player --> a_demolish["Demolish<br/>20% refund"]
        a_player --> a_food["Set food level<br/>cheap ↔ generous"]
        a_player --> a_fund["Start fundraiser<br/>daytime, costs food"]
        a_player --> a_expand["Expand land"]
        a_player --> a_tier["Upgrade tier"]
        a_player --> a_answer["Answer events"]
        a_fund --> a_fwin["Success<br/>+money, +2 Rep, +15 LIFE"]
        a_fund --> a_ffail["Failure<br/>−2 Rep, +5 LIFE"]
    end

    subgraph RES["4 · Residents"]
        r_arrive["Resident arrives<br/>needs a free bed"] --> r_needs["Needs loop<br/>sleep, eat, clinic, socialize, bathroom"]
        r_needs --> r_meters["Health & LIFE meters"]
        r_meters --> r_needs
        r_meters -- "LIFE reaches 100" --> r_reint["Reintegration<br/>+5 Rep"]
        r_meters -- "Health too low" --> r_left["Leaves unhealthy<br/>−3 Rep"]
    end

    subgraph EVENTS["5 · Events & disasters"]
        e_event{"Random event"}
        e_event -- "Donation drive,<br/>community support" --> e_money["+money, +Rep"]
        e_event -- "Outbreak, pipe burst,<br/>inspection" --> e_cost["Pay money<br/>or lose Rep"]
        e_event -- "Media coverage" --> e_media["Rep 60+: +Rep & money<br/>else −Rep"]
        e_event -- "Someone needs a place" --> e_arrival{"Accept?"}
        e_arrival -- "Refer elsewhere" --> e_ref["Nothing or<br/>small Rep loss"]
        e_event -- "Ignored / expired" --> e_exp["−2 Rep"]
        e_dis{"Disaster"} --> e_nat["Natural<br/>buildings damaged, −money"]
        e_dis -.-> e_crisis{"Crisis<br/>take in displaced?"}
        e_crisis -.->|"Decline"| e_dec["−2 to −12 Rep"]
    end

    subgraph PROG["6 · Progression & fail states"]
        p_t1["Tier 1 · Starter Shelter<br/>10 residents"] -- "Upgrade: ₱150k,<br/>5 reintegrated, Rep 60+" --> p_t2["Tier 2 · Community Hub<br/>25 residents"]
        p_t2 -- "Upgrade: ₱400k,<br/>15 reintegrated, Rep 60+" --> p_t3["Tier 3 · Opportunity Center<br/>50 residents"]
        p_t3 -- "Upgrade: ₱1M,<br/>40 reintegrated, Rep 60+" --> p_t4["Tier 4 · Campus<br/>100 residents"]
        p_bank{"Money below −₱25k?<br/>daily bills, upkeep"} -- Yes --> p_count["18-min bankruptcy countdown"]
        p_count -- "Back to ₱0" --> p_safe["Countdown cancelled"]
        p_rep{"Rep hits 0?"}
        p_empty{"Every resident gone?"}
    end

    subgraph END_STATES["End states"]
        s_win["Victory<br/>10+ reintegrated & Rep 80+<br/>or Day 50+ & Rep 70+<br/>→ Continue playing"]
        s_over["Game Over<br/>→ Restart from a new shelter"]
    end

    %% ---------- how the sections connect ----------
    s_play --> d_day
    d_day --> a_player
    d_bg --> e_event
    d_bg --> e_dis
    a_answer --> e_event
    e_arrival -- "Accept" --> r_arrive
    e_crisis -.->|"Accept"| r_arrive
    a_build -- "rooms serve needs" --> r_needs
    a_fwin -- "LIFE boost" --> r_meters
    r_reint -- "counts toward<br/>tiers & victory" --> p_t1
    r_left --> p_empty
    p_t4 -- "keep reintegrating,<br/>keep Rep high" --> s_win
    p_count -- "Time runs out" --> s_over
    p_rep -- Yes --> s_over
    p_empty -- Yes --> s_over
```

---

## 1. Session flow

```mermaid
flowchart TD
    Launch["Launch game"] --> FirstRun{"First time playing?"}
    FirstRun -- Yes --> Tutorial["Tutorial<br/>10 steps, can skip"]
    FirstRun -- No --> Play
    Tutorial --> Play["Playing"]

    Play -- "Space / window loses focus" --> Pause["Paused<br/>time stops"]
    Pause -- "Resume" --> Play
    Play <--> Settings["Settings<br/>audio, shortcuts"]
    Settings --> SaveLoad["Save / Load<br/>slots 1–3 + Auto"]
    SaveLoad -- "Load" --> Play
    Settings -- "Reset game" --> Fresh["New shelter<br/>₱250k, 3 residents"]
    Fresh --> Play

    Play --> Win{"Victory reached?"}
    Win -- "10+ reintegrated & Rep 80+<br/>or Day 50+ & Rep 70+" --> Victory["Victory screen"]
    Victory -- "Continue" --> Play

    Play --> Lose{"Fail condition?"}
    Lose -- "Bankrupt / Rep 0 / Shelter empty" --> GameOver["Game Over"]
    GameOver -- "Restart" --> Fresh
```

The game autosaves on its own. Victory does not end the run: the player can keep playing. Game over can only be followed by a restart.

---

## 2. Core loop: day and night

```mermaid
flowchart TD
    subgraph DAY["☀ Day: 4 minutes"]
        direction LR
        D1["All rooms open"]
        D2["Residents meet needs:<br/>eat, clinic, socialize, bathroom"]
        D3["Player builds, runs fundraisers,<br/>answers events"]
    end

    subgraph NIGHT["☾ Night: 2 minutes"]
        direction LR
        N1["Residents sleep in dorms"]
        N2["Cafeteria, dining hall, admin office,<br/>fundraiser station closed"]
        N3["No new fundraisers,<br/>no demolishing"]
    end

    subgraph DAWN["Dawn: daily bills & reset"]
        direction LR
        W1["Pay operating costs<br/>₱1,500 + ₱100 per resident<br/>+ ₱100 per room"]
        W2["Pay daily food bill<br/>health & Rep change<br/>by food level"]
        W3["Reputation drifts down<br/>never below 30"]
        W4["Sleepers wake:<br/>+30 health"]
    end

    DAY -- "Dusk" --> NIGHT
    NIGHT -- "Dawn" --> DAWN
    DAWN -- "New day" --> DAY

    subgraph ALWAYS["Always running, day and night"]
        direction LR
        A1["Every 90 s: donation chance<br/>higher with Rep & residents"]
        A2["Every 5 min:<br/>room maintenance bill"]
        A3["Every 1–3 min:<br/>random event"]
        A4["Warnings: low money, hunger,<br/>sick residents, low Rep"]
    end
```

One in-game day lasts 6 minutes. Money comes in from donations, fundraisers and events. It goes out every dawn and every maintenance cycle. The core tension is keeping that balance positive while still growing.

---

## 3. Player actions and outcomes

```mermaid
flowchart TD
    P(("Player")) --> Build["Build menu"]
    P --> Manage["Manage menu"]
    P --> Reports["Reports menu"]
    P --> Inspect["Click a resident<br/>view health, LIFE, energy"]

    %% ---------- BUILD ----------
    Build --> Place["Place a room<br/>pay build cost"]
    Place --> Essentials["Essentials: Dormitory, Cafeteria, Bathroom<br/>beds, food, hygiene"]
    Place --> Health["Health: Clinic → Medical Center<br/>restores health"]
    Place --> Social["Social: Common Room, Library, Garden<br/>health + faster LIFE growth"]
    Place --> Mgmt["Management: Fundraiser Station, Admin Office<br/>enables fundraisers"]
    Place --> Decor["Decor: Potted Plant, Fountain<br/>bonus to neighboring rooms"]
    Place --> Adj["Room placement matters:<br/>neighbors give bonuses or penalties"]
    Place --> Upkeep["Every room adds to<br/>maintenance & daily costs"]
    Build --> Demolish["Demolish a room<br/>refund 20% of cost"]

    %% ---------- MANAGE ----------
    Manage --> Tier["Upgrade shelter tier"]
    Tier --> TierOut["Higher resident cap,<br/>bigger donations, new rooms"]

    Manage --> FoodLvl["Set food level<br/>5 levels"]
    FoodLvl --> FoodLow["Cheap food: save money<br/>lose health & Rep daily"]
    FoodLvl --> FoodHigh["Generous food: costs more<br/>gain health & Rep daily"]

    Manage --> Fund["Start fundraiser<br/>daytime only, costs food"]
    Fund --> Team["1–3 rested residents go out<br/>healthier team = better odds"]
    Team --> FundWin["Success<br/>+money, +2 Rep, +15 LIFE"]
    Team --> FundFail["Failure<br/>−2 Rep, +5 LIFE"]
    FundWin --> Tired["Team loses health<br/>and must rest"]
    FundFail --> Tired
    Fund --> Cancel["Cancel: food is not refunded"]

    Manage --> Expand["Expand land north / east / west<br/>gets pricier each time"]
    Manage --> Roster["Resident list"]

    %% ---------- REPORTS ----------
    Reports --> Alerts["Alerts: warnings with fixes"]
    Reports --> Stats["Statistics"]
    Reports --> Fin["Finances dashboard"]
```

Most decisions trade money now against reputation, health or growth later. Fundraisers are the main way to raise a resident's LIFE meter, which means they drive reintegration. They cost food and wear residents out.

---

## 4. Resident lifecycle

```mermaid
flowchart TD
    Event["Player accepts an arrival event"] --> Bed{"Free bed of matching gender<br/>and under the tier cap?"}
    Bed -- No --> Refused["Can't accept"]
    Bed -- Yes --> Arrive["Resident arrives<br/>70 health, low LIFE<br/>young adult / adult / elderly"]

    Arrive --> Needs{"What do they need now?"}
    Needs -- "Night" --> Sleep["Sleep in dorm<br/>+health"]
    Needs -- "Hungry" --> Eat{"Food in stock?"}
    Eat -- Yes --> Ate["Eat: uses 3 food"]
    Eat -- No --> Hungry["Leaves hungry"]
    Needs -- "Health below 35" --> Clinic["Clinic<br/>+health"]
    Needs -- "Health below 60" --> Socialize["Common Room / Library / Garden<br/>+health"]
    Needs -- "Random" --> Bath["Bathroom"]
    Needs -- "Nothing urgent" --> Stroll["Wander"]
    Sleep & Ate & Hungry & Clinic & Socialize & Bath & Stroll --> Meters

    Meters["Health decays daily<br/>elderly fastest<br/>LIFE grows slowly"] --> Fundraise["Joins fundraisers<br/>big LIFE boost"]
    Fundraise --> Meters
    Meters --> Needs

    Meters -- "LIFE reaches 100" --> Reintegrated["Reintegration<br/>resident leaves ready for life outside<br/>+5 Rep"]
    Meters -- "Health below 20 for too long<br/>or health hits 0" --> LeftSick["Leaves unhealthy<br/>−3 Rep"]
```

Each resident has two meters. **Health** keeps them in the shelter. **LIFE** measures their readiness for life outside, and reintegration happens when it fills. The player's job is to keep health up long enough for LIFE to fill.

---

## 5. Events and choices

Random events arrive every 1–3 minutes, with at most 3 waiting at once. Each one must be answered within 5 minutes. **Ignoring an event or letting it expire costs −2 Rep.**

### 5a. Random events

```mermaid
flowchart LR
    E(("Random event")) --> DD["Donation drive"]
    DD -- "Accept" --> DD1["+₱15k + ₱5k per resident, +2 Rep"]
    DD -- "Decline" --> DD2["Nothing"]

    E --> HO["Health outbreak"]
    HO -- "Pay for treatment" --> HO1["−₱20k or more, +2 Rep"]
    HO -- "Quarantine" --> HO2["Residents lose health for a while"]
    HO -- "Ignore" --> HO3["−3 Rep, bigger health loss"]

    E --> MC["Media coverage"]
    MC -- "Accept, Rep 60+" --> MC1["+10 Rep, +₱25k"]
    MC -- "Accept, Rep below 60" --> MC2["−8 Rep"]
    MC -- "Decline" --> MC3["−2 Rep"]

    E --> VD["Volunteer day"]
    VD -- "Accept" --> VD1["+3 Rep, free maintenance for 1 hour"]
    VD -- "Decline" --> VD2["Nothing"]

    E --> IN["Inspection: must pay ₱10k"]
    IN -- "Rep 50+" --> IN1["Pass: +₱50k grant, +5 Rep"]
    IN -- "Rep below 50" --> IN2["Fail: −5 Rep, −₱25k fine"]

    E --> CS["Community support"]
    CS -- "Take in 2–4 people" --> CS1["New residents, +3 Rep"]
    CS -- "Take money" --> CS2["+₱15–40k, +2 Rep"]
    CS -- "Decline" --> CS3["Nothing"]

    E --> PB["Pipe burst"]
    PB -- "Repair" --> PB1["−₱5k"]
    PB -- "Ignore" --> PB2["−3 Rep"]

    E --> AR["Someone needs a place"]
    AR -- "Accept, needs free bed" --> AR1["New resident<br/>+ small Rep or money bonus"]
    AR -- "Refer elsewhere" --> AR2["Nothing<br/>family reunion: −1 Rep"]
```

Arrival events include an elder transfer, a job referral, a knock at the door, street outreach, a hospital referral and a family reunification. Accepting them is the **only way new residents join** the shelter.

### 5b. Disasters

About every 5 minutes, a disaster may strike the community.

```mermaid
flowchart TD
    D(("Disaster")) --> Nat["Natural: earthquake, winter storm"]
    Nat --> NatOut["1–4 buildings damaged<br/>−₱7.5k each, paid immediately"]

    D --> Surge["Crisis: house fire, factory closure,<br/>domestic violence, hospital discharge, eviction wave"]
    Surge -.-> Choice{"Take in the displaced people?<br/>timer: 1–5 min by urgency"}
    Choice -.->|"Accept all or some"| Acc["2–8 new residents<br/>+5 to +15 Rep, ₱5–25k donation<br/>some need extra security/medical costs"]
    Choice -.->|"Decline"| Dec["−2 to −12 Rep"]
    Surge -- "No answer" --> Exp["Expires: −2 to −12 Rep"]
```

Bigger crises bring more people and more reputation, and they cost more to turn away. Today the decision window is not shown, so every crisis expires and costs its decline penalty (dashed lines).

---

## 6. Progression and fail states

```mermaid
flowchart LR
    T1["Tier 1<br/>Starter Shelter<br/>up to 10 residents"] -- "₱150k<br/>5 reintegrated" --> T2["Tier 2<br/>Community Hub<br/>up to 25 residents<br/>donations ×1.2"]
    T2 -- "₱400k<br/>15 reintegrated" --> T3["Tier 3<br/>Opportunity Center<br/>up to 50 residents<br/>donations ×1.5"]
    T3 -- "₱1M<br/>40 reintegrated" --> T4["Tier 4<br/>Campus<br/>up to 100 residents<br/>donations ×2"]

    Req["Every upgrade also needs:<br/>Rep 60+ and 40% of land built on"] -.- T2
    T2 --- U2["Unlocks: Admin Office,<br/>Large Dormitory, Library"]
    T3 --- U3["Unlocks: Medical Center, Dining Hall,<br/>Garden, Fountain"]
```

```mermaid
flowchart TD
    Money{"Money below −₱25k?"} -- Yes --> Count["Bankruptcy countdown: 18 min<br/>can't build or fundraise"]
    Count -- "Back to ₱0 or more" --> Safe["Countdown cancelled"]
    Count -- "Time runs out" --> GO["Game Over"]

    Rep{"Reputation hits 0?"} -- Yes --> GO
    Empty{"Every resident has left?"} -- Yes --> GO
```

**Ways to win:** reintegrate 10+ residents with Rep 80+, *or* survive 50+ days with Rep 70+.

**Ways to lose:** bankruptcy, reputation collapse, or an empty shelter.

---

## Not yet wired in

These features are designed and partly built, but do not affect play yet:

- **Disaster decision window.** Crisis disasters can't be accepted or declined yet. They always expire with the decline penalty, and their displaced residents never arrive.
- **Lasting event effects.** The health loss from quarantine or ignoring an outbreak, and volunteer day's free maintenance, are recorded but never applied. Only the reputation and money changes take effect.
- **Tier upgrades enlarging the land.** Upgrading raises the resident cap and donations but doesn't enlarge the buildable area. Land grows only through Expand.
- **Game speed setting.** Present in Settings, but has no effect.
