# Open Arms — Game Start and Menus

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "20px"}, "flowchart": {"nodeSpacing": 18, "rankSpacing": 30, "padding": 8}}}%%
flowchart TD
    open["Open game"] --> cfg["Load config"] --> newg["New shelter"] --> first{"First time?"}
    first -- "Yes" --> tut["Tutorial<br/>10 steps"]
    tut -- "Skip / Finish" --> play
    first -- "No" --> play(["Playing"])

    play --> top["Top bar"] & tb["Toolbar"] & mapc["Map click"]
    play -- "F12" --> dev["Dev Mode"]
    play -.-> pop["Pop-ups"]

    top --> zp["Zoom · Pause"] & settings["Settings"]
    tb --> build["Build"] & manage["Manage"] & reports["Reports"]

    build --> cat["Category"] --> room{"Room"}
    room -- "Dorm" --> who["Gender"] --> place["Place"]
    room -- "Other" --> place
    place -- "Click" --> built["Built"]
    place -- "Esc" --> cancel["Cancel"]

    manage --> MT
    subgraph MT["Tabs"]
        m1["Food"] ~~~ m2["Upgrade"] ~~~ m3["Fundraisers"] ~~~ m4["Expand"] ~~~ m5["Residents"]
    end

    reports --> RT
    subgraph RT["Tabs"]
        r1["Alerts<br/>→ Manage"] ~~~ r2["Stats"] ~~~ r3["Finances"]
    end

    settings --> ST
    subgraph ST["Sections"]
        s1["Audio"] ~~~ s2["Speed"] ~~~ s3["Status bars"] ~~~ s4["Shortcuts"] ~~~ s5["Save / Load"] ~~~ s6["Reset"] ~~~ s7["About"]
    end

    mapc --> CT
    subgraph CT["Cards"]
        c1["Resident"] ~~~ c2["Room<br/>Remove"]
    end

    dev --> d1["Timers<br/>Day/Night<br/>Events<br/>Resources<br/>Stats<br/>Actions"]

    pop --> PT
    subgraph PT["Pop-ups"]
        e1["Event"] ~~~ f1["Fundraiser<br/>done"] ~~~ over{"Game<br/>over"}
    end
    over -- "Lose" --> rs["Restart"]
    over -- "Win" --> ct["Continue<br/>or Restart"]

    classDef menu fill:#dfeccf,stroke:#4f7a3a,stroke-width:2px,color:#000,font-weight:bold
    classDef item fill:#ffffff,stroke:#9aa592,color:#000
    class play,build,manage,reports,settings,mapc,dev,pop,top,tb menu
    class m1,m2,m3,m4,m5,r1,r2,r3,s1,s2,s3,s4,s5,s6,s7,c1,c2,e1,f1,d1 item
    style MT fill:#f4f8ef,stroke:#b9c4ae
    style RT fill:#f4f8ef,stroke:#b9c4ae
    style ST fill:#f4f8ef,stroke:#b9c4ae
    style CT fill:#f4f8ef,stroke:#b9c4ae
    style PT fill:#f4f8ef,stroke:#b9c4ae
```

Dotted arrow: opens by itself. Save, Load and Reset ask to confirm.

| Key | Does |
|---|---|
| Space | Pause |
| S | Save |
| B | Status bars |
| Esc | Close / cancel |
| F12 | Dev Mode |
