/* =========================================================
   Trading Formulas (Educational) — Offline Static Site
   - Theme toggle with localStorage
   - Formula cards (20+), copy formula
   - Live search filtering
   - Calculators (8) with validation + example fill (>=3)
========================================================= */

(function () {
  "use strict";

  // ---------- Utils ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const isFiniteNumber = (v) => Number.isFinite(v) && !Number.isNaN(v);

  function toNumber(value) {
    if (value === "" || value === null || value === undefined) return NaN;
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function roundToStep(value, step) {
    if (!isFiniteNumber(value) || !isFiniteNumber(step) || step <= 0) return value;
    return Math.round(value / step) * step;
  }

  function formatMoney(n) {
    if (!isFiniteNumber(n)) return "—";
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);
    return `${sign}$${abs.toFixed(2)}`;
  }

  function formatNumber(n, digits = 2) {
    if (!isFiniteNumber(n)) return "—";
    return n.toFixed(digits);
  }

  function showToast(msg) {
    const toast = $("#toast");
    const text = $("#toastText");
    if (!toast || !text) return;
    text.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.hidden = true;
    }, 1800);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("تم نسخ الصيغة ✅");
      return true;
    } catch (e) {
      // Fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast("تم نسخ الصيغة ✅");
        return true;
      } catch (e2) {
        showToast("تعذر النسخ — انسخ يدويًا");
        return false;
      }
    }
  }

  // ---------- Theme ----------
  const THEME_KEY = "tf_theme";
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    // update icon
    const btn = $("#themeToggle");
    if (btn) {
      const icon = btn.querySelector(".btn-icon");
      const txt = btn.querySelector(".btn-text");
      const isLight = theme === "light";
      if (icon) icon.textContent = isLight ? "☀" : "☾";
      if (txt) txt.textContent = isLight ? "فاتح" : "داكن";
      btn.setAttribute("aria-label", isLight ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح");
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const defaultTheme = "dark"; // Requirement: dark mode default
    const theme = saved === "light" || saved === "dark" ? saved : defaultTheme;
    applyTheme(theme);

    const toggle = $("#themeToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || defaultTheme;
        const next = current === "dark" ? "light" : "dark";
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
      });
    }
  }

  // ---------- Formulas Data ----------
  const formulas = [
    // A) PnL & Costs (1–5)
    {
      id: "pnl_gross",
      group: "PnL & Costs",
      titleAr: "الربح/الخسارة الإجمالي",
      titleEn: "Gross PnL",
      formula: "PnL($) = TicksMoved × TickValue@1.00 × Lots",
      vars: [
        { k: "TicksMoved", v: "عدد التيكات التي تحركها السعر لصالح/ضد الصفقة" },
        { k: "TickValue@1.00", v: "قيمة التيك بالدولار عند لوت 1.00" },
        { k: "Lots", v: "حجم الصفقة (اللوت)" },
      ],
      example: "مثال رمزي: إذا TicksMoved=50 و TickValue@1.00=0.10 و Lots=0.20 ⇒ PnL=50×0.10×0.20=$1.00",
      why: "يساعدك على فهم تأثير اللوت وقيمة التيك على نتيجة صفقة السكالبينج.",
    },
    {
      id: "spread_cost",
      group: "PnL & Costs",
      titleAr: "تكلفة السبريد",
      titleEn: "Spread Cost",
      formula: "SpreadCost($) = SpreadTicks × TickValue@1.00 × Lots",
      vars: [
        { k: "SpreadTicks", v: "السبريد محسوب بالتيك" },
        { k: "TickValue@1.00", v: "قيمة التيك عند لوت 1.00" },
        { k: "Lots", v: "حجم الصفقة" },
      ],
      example: "مثال: SpreadTicks=18 و TickValue=0.10 و Lots=0.30 ⇒ SpreadCost=18×0.10×0.30=$0.54",
      why: "لأن السكالبينج أهدافه صغيرة، فالسبريد قد يستهلك جزءًا كبيرًا من الربح.",
    },
    {
      id: "commission_cost",
      group: "PnL & Costs",
      titleAr: "تكلفة العمولة",
      titleEn: "Commission Cost",
      formula: "CommissionCost($) = CommissionPerLotRoundTurn × Lots",
      vars: [
        { k: "CommissionPerLotRoundTurn", v: "عمولة اللوت (فتح+إغلاق) بالدولار" },
        { k: "Lots", v: "حجم الصفقة" },
      ],
      example: "مثال: CommissionPerLotRT=7 و Lots=0.25 ⇒ CommissionCost=7×0.25=$1.75",
      why: "العمولة قد تجعل صفقات صغيرة تتحول إلى تعادل أو خسارة صافية.",
    },
    {
      id: "net_pnl",
      group: "PnL & Costs",
      titleAr: "الربح/الخسارة الصافي",
      titleEn: "Net PnL",
      formula: "NetPnL($) = GrossPnL − SpreadCost − CommissionCost",
      vars: [
        { k: "GrossPnL", v: "النتيجة قبل التكاليف" },
        { k: "SpreadCost", v: "تكلفة السبريد" },
        { k: "CommissionCost", v: "تكلفة العمولة" },
      ],
      example: "مثال: Gross=$5, Spread=$1, Comm=$1.5 ⇒ Net=$2.5",
      why: "يعطيك صورة أقرب للواقع لأن التداول الحقيقي يتضمن تكاليف.",
    },
    {
      id: "breakeven_ticks",
      group: "PnL & Costs",
      titleAr: "حركة التعادل بالتيك",
      titleEn: "Breakeven Move",
      formula: "BreakevenMoveTicks = SpreadTicks + (CommissionCost / (TickValue@1.00 × Lots))",
      vars: [
        { k: "SpreadTicks", v: "السبريد بالتيك" },
        { k: "CommissionCost", v: "عمولة الصفقة بالدولار" },
        { k: "TickValue@1.00", v: "قيمة التيك عند 1.00" },
        { k: "Lots", v: "حجم الصفقة" },
      ],
      example: "مثال: Spread=16, CommissionCost=1.75, TickValue=0.10, Lots=0.25 ⇒ BE=16+(1.75/(0.10×0.25))",
      why: "يحدد الحد الأدنى للحركة قبل أن تصبح الصفقة رابحة صافيًا.",
    },

    // B) Risk & Position Sizing (6–11)
    {
      id: "risk_usd",
      group: "Risk & Position Sizing",
      titleAr: "المخاطرة بالدولار",
      titleEn: "Risk $",
      formula: "Risk($) = Balance × Risk%",
      vars: [
        { k: "Balance", v: "رصيد الحساب" },
        { k: "Risk%", v: "نسبة المخاطرة لكل صفقة (مثلاً 1%)" },
      ],
      example: "مثال: Balance=500, Risk%=1% ⇒ Risk=$5",
      why: "يحوّل النسبة إلى رقم واضح لتجنب مخاطرة أكبر من المتوقع.",
    },
    {
      id: "lots_from_risk",
      group: "Risk & Position Sizing",
      titleAr: "حساب اللوت من المخاطرة",
      titleEn: "Lots from Risk",
      formula: "Lots = Risk($) ÷ (StopTicks × TickValue@1.00)",
      vars: [
        { k: "Risk($)", v: "المخاطرة بالدولار" },
        { k: "StopTicks", v: "وقف الخسارة بالتيك" },
        { k: "TickValue@1.00", v: "قيمة التيك عند لوت 1.00" },
      ],
      example: "مثال: Risk=$5, Stop=100, TickValue=0.10 ⇒ Lots=5/(100×0.10)=0.50",
      why: "يساعد على توحيد المخاطرة بدل تغيير اللوت عشوائيًا.",
    },
    {
      id: "rr_ratio",
      group: "Risk & Position Sizing",
      titleAr: "نسبة العائد للمخاطرة",
      titleEn: "R:R",
      formula: "R:R = TPDistance ÷ SLDistance",
      vars: [
        { k: "TPDistance", v: "مسافة الهدف (تيك/نقطة)" },
        { k: "SLDistance", v: "مسافة الوقف (تيك/نقطة)" },
      ],
      example: "مثال: TP=60, SL=30 ⇒ R:R=2.0",
      why: "تساعدك تربط أهدافك بالمخاطرة وتفهم متطلبات نسبة الفوز للتعادل.",
    },
    {
      id: "bewr_no_costs",
      group: "Risk & Position Sizing",
      titleAr: "نسبة الفوز للتعادل (بدون تكاليف)",
      titleEn: "Breakeven WinRate",
      formula: "Breakeven WinRate = 1 ÷ (1 + R:R)",
      vars: [
        { k: "R:R", v: "نسبة العائد للمخاطرة" },
      ],
      example: "مثال: R:R=2 ⇒ BE WinRate = 1/(1+2)=33.33%",
      why: "مرجع سريع لفهم كيف تؤثر R:R على متطلبات نسبة الفوز (تعليمي).",
    },
    {
      id: "max_daily_loss",
      group: "Risk & Position Sizing",
      titleAr: "حد الخسارة اليومي",
      titleEn: "Max Daily Loss",
      formula: "MaxDailyLoss($) = Balance × DailyLoss%",
      vars: [
        { k: "Balance", v: "الرصيد" },
        { k: "DailyLoss%", v: "نسبة حد الخسارة اليومي" },
      ],
      example: "مثال: Balance=1000, DailyLoss%=3% ⇒ $30",
      why: "يساعد على وضع “فرامل” تعليمية لمنع التصعيد بعد سلسلة خسائر.",
    },
    {
      id: "max_weekly_loss",
      group: "Risk & Position Sizing",
      titleAr: "حد الخسارة الأسبوعي",
      titleEn: "Max Weekly Loss",
      formula: "MaxWeeklyLoss($) = Balance × WeeklyLoss%",
      vars: [
        { k: "Balance", v: "الرصيد" },
        { k: "WeeklyLoss%", v: "نسبة حد الخسارة الأسبوعي" },
      ],
      example: "مثال: Balance=1000, WeeklyLoss%=7% ⇒ $70",
      why: "يضيف حماية تعليمية على مستوى الأسبوع لتقليل ضغط التعويض.",
    },

    // C) Statistics & Edge (12–20)
    {
      id: "winrate",
      group: "Statistics & Edge",
      titleAr: "نسبة الفوز",
      titleEn: "Win Rate",
      formula: "WinRate = Wins ÷ TotalTrades",
      vars: [
        { k: "Wins", v: "عدد الصفقات الرابحة" },
        { k: "TotalTrades", v: "إجمالي الصفقات" },
      ],
      example: "مثال: Wins=45, Total=100 ⇒ 45%",
      why: "بداية فهم الأداء—لكن لا تكفي وحدها بدون متوسط ربح/خسارة.",
    },
    {
      id: "lossrate",
      group: "Statistics & Edge",
      titleAr: "نسبة الخسارة",
      titleEn: "Loss Rate",
      formula: "LossRate = 1 − WinRate",
      vars: [
        { k: "WinRate", v: "نسبة الفوز" },
      ],
      example: "مثال: WinRate=45% ⇒ LossRate=55%",
      why: "تدخل مباشرة في حساب Expectancy.",
    },
    {
      id: "avgwin",
      group: "Statistics & Edge",
      titleAr: "متوسط الربح",
      titleEn: "Average Win",
      formula: "AvgWin = TotalProfit ÷ Wins",
      vars: [
        { k: "TotalProfit", v: "إجمالي الأرباح (مجموع الربح)" },
        { k: "Wins", v: "عدد الصفقات الرابحة" },
      ],
      example: "مثال: TotalProfit=260, Wins=40 ⇒ AvgWin=$6.50",
      why: "مع WinRate يوضح جودة الصفقات الرابحة.",
    },
    {
      id: "avgloss",
      group: "Statistics & Edge",
      titleAr: "متوسط الخسارة",
      titleEn: "Average Loss",
      formula: "AvgLoss = TotalLoss ÷ Losses (absolute value)",
      vars: [
        { k: "TotalLoss", v: "إجمالي الخسائر (كمطلق)" },
        { k: "Losses", v: "عدد الصفقات الخاسرة" },
      ],
      example: "مثال: TotalLoss=200, Losses=50 ⇒ AvgLoss=$4.00",
      why: "مفتاح لمعرفة هل خسائرك أكبر من أرباحك أم العكس.",
    },
    {
      id: "profitfactor",
      group: "Statistics & Edge",
      titleAr: "عامل الربحية",
      titleEn: "Profit Factor",
      formula: "ProfitFactor = TotalProfit ÷ TotalLoss",
      vars: [
        { k: "TotalProfit", v: "مجموع الأرباح" },
        { k: "TotalLoss", v: "مجموع الخسائر (كمطلق)" },
      ],
      example: "مثال: Profit=260, Loss=200 ⇒ PF=1.30",
      why: "مؤشر إجمالي: >1 يعني الأرباح أكبر من الخسائر تاريخيًا (لا ضمان).",
    },
    {
      id: "expect_usd",
      group: "Statistics & Edge",
      titleAr: "التوقع الرياضي بالدولار",
      titleEn: "Expectancy ($)",
      formula: "Expectancy($) = (WinRate×AvgWin) − (LossRate×AvgLoss)",
      vars: [
        { k: "WinRate", v: "نسبة الفوز (0..1)" },
        { k: "AvgWin", v: "متوسط الربح بالدولار" },
        { k: "LossRate", v: "نسبة الخسارة (0..1)" },
        { k: "AvgLoss", v: "متوسط الخسارة (كمطلق) بالدولار" },
      ],
      example: "مثال: WR=0.45, AW=6.5, LR=0.55, AL=4 ⇒ Exp=0.45×6.5−0.55×4",
      why: "يقيس متوسط الربح/الخسارة المتوقع لكل صفقة عبر عدد كبير من الصفقات.",
    },
    {
      id: "expect_r",
      group: "Statistics & Edge",
      titleAr: "التوقع الرياضي بوحدة R",
      titleEn: "Expectancy (R)",
      formula: "Expectancy(R) = (WinRate×AvgWinR) − (LossRate×AvgLossR)",
      vars: [
        { k: "AvgWinR", v: "متوسط الربح بوحدة R" },
        { k: "AvgLossR", v: "متوسط الخسارة بوحدة R (عادة 1)" },
      ],
      example: "مثال: WR=0.40, AvgWinR=1.8, LR=0.60, AvgLossR=1 ⇒ ExpR=0.40×1.8−0.60×1",
      why: "يفيد للمقارنة بين استراتيجيات مختلفة بغض النظر عن حجم الحساب.",
    },
    {
      id: "drawdown",
      group: "Statistics & Edge",
      titleAr: "نسبة السحب (Drawdown)",
      titleEn: "Drawdown %",
      formula: "Drawdown% = (PeakEquity − TroughEquity) ÷ PeakEquity × 100",
      vars: [
        { k: "PeakEquity", v: "أعلى قيمة وصل لها صافي الحساب" },
        { k: "TroughEquity", v: "أدنى قيمة بعدها" },
      ],
      example: "مثال: Peak=1200, Trough=1020 ⇒ DD%=(180/1200)×100=15%",
      why: "يساعد على فهم “أسوأ هبوط” تاريخيًا وكيف يؤثر على نفسية وإدارة المخاطر.",
    },
    {
      id: "ror_simple",
      group: "Statistics & Edge",
      titleAr: "مخاطر الإفلاس (تقريب تعليمي)",
      titleEn: "Risk of Ruin (Simple)",
      formula: "مفهوم: كلما زادت المخاطرة لكل صفقة وازدادت سلسلة خسائر محتملة، زادت احتمالية استنزاف الحساب.",
      vars: [
        { k: "Risk/Trade", v: "المخاطرة لكل صفقة" },
        { k: "WinRate", v: "نسبة الفوز" },
        { k: "R:R", v: "العائد للمخاطرة" },
      ],
      example: "مثال رمزي: مخاطرة عالية + WinRate غير كافية ⇒ احتمال هبوط كبير أعلى.",
      why: "للتذكير أن الإدارة أهم من “صفقة واحدة”. (بطاقة تعليمية — advanced غير مطبق).",
      extraLinkText: "advanced",
    },

    // D) Margin & Leverage (21–22)
    {
      id: "margin",
      group: "Margin & Leverage",
      titleAr: "المارجن التقريبي",
      titleEn: "Margin (Approx.)",
      formula: "Margin ≈ (ContractValue × Lots) ÷ Leverage",
      vars: [
        { k: "ContractValue", v: "قيمة العقد (قد تعتمد على السعر/حجم العقد)" },
        { k: "Lots", v: "حجم الصفقة" },
        { k: "Leverage", v: "الرافعة (مثلاً 1:500 ⇒ Leverage=500)" },
      ],
      example: "مثال رمزي: ContractValue=100000, Lots=0.1, Leverage=500 ⇒ Margin≈(100000×0.1)/500",
      why: "لفهم كيف تؤثر الرافعة على الهامش المطلوب (تعليمي).",
    },
    {
      id: "margin_level",
      group: "Margin & Leverage",
      titleAr: "مستوى المارجن",
      titleEn: "Margin Level %",
      formula: "MarginLevel% = Equity ÷ UsedMargin × 100",
      vars: [
        { k: "Equity", v: "صافي الحساب (يشمل الربح/الخسارة العائم)" },
        { k: "UsedMargin", v: "الهامش المستخدم" },
      ],
      example: "مثال: Equity=900, UsedMargin=300 ⇒ 300%",
      why: "مؤشر صحيّة الحساب بالنسبة للهامش (تعليمي فقط).",
    },

    // Extra (to keep learning richer, still aligned with required ones)
    {
      id: "ticks_from_price",
      group: "Extras (Educational)",
      titleAr: "تحويل حركة السعر إلى تيك",
      titleEn: "Ticks from Price Move",
      formula: "TicksMoved = PriceMove ÷ TickSize",
      vars: [
        { k: "PriceMove", v: "فرق السعر (مثلاً 0.50)" },
        { k: "TickSize", v: "حجم التيك (مثلاً 0.01)" },
      ],
      example: "مثال: PriceMove=0.50, TickSize=0.01 ⇒ Ticks=50",
      why: "لأن بعض الحاسبات تستخدم ticks بدل السعر مباشرة.",
    },
    {
      id: "net_rr_with_costs",
      group: "Extras (Educational)",
      titleAr: "R:R تقريبي بعد التكاليف",
      titleEn: "Net R:R (Approx.)",
      formula: "NetRewardTicks ≈ TP_Ticks − BreakevenMoveTicks",
      vars: [
        { k: "TP_Ticks", v: "الهدف بالتيك" },
        { k: "BreakevenMoveTicks", v: "تيكات التعادل" },
      ],
      example: "مثال: TP=40 ticks, BE=18 ticks ⇒ NetReward≈22 ticks",
      why: "تعليميًا: يوضح كيف تقل “المكافأة” الفعلية بعد التكاليف.",
    },
  ];

  // ---------- Render Formula Cards ----------
  function createFormulaCard(f) {
    const varsChips = f.vars
      .map((x) => `<span class="chip"><code>${escapeHtml(x.k)}</code> ${escapeHtml(x.v)}</span>`)
      .join("");

    const tags = [
      `<span class="badge">${escapeHtml(f.group)}</span>`,
      f.extraLinkText ? `<span class="badge">${escapeHtml(f.extraLinkText)}</span>` : "",
    ].join("");

    const searchable = [
      f.titleAr, f.titleEn, f.group, f.formula,
      ...(f.vars || []).map(v => `${v.k} ${v.v}`),
      f.example, f.why
    ].join(" | ");

    const el = document.createElement("article");
    el.className = "card glass formula-card";
    el.setAttribute("data-id", f.id);
    el.setAttribute("data-search", searchable.toLowerCase());

    el.innerHTML = `
      <header class="card-head">
        <h3 class="card-title">${escapeHtml(f.titleAr)} <span class="muted">(${escapeHtml(f.titleEn)})</span></h3>
        <div class="summary-meta">${tags}</div>
      </header>

      <div class="formula-box">
        <div class="mono" data-formula-text>${escapeHtml(f.formula)}</div>
      </div>

      <div class="vars">${varsChips}</div>

      <div class="actions">
        <button class="btn btn-secondary js-copy-formula" type="button" data-formula="${escapeAttr(f.formula)}">
          نسخ الصيغة (Copy)
        </button>
        <a class="btn btn-ghost" href="#calculators" title="اذهب للحاسبات">فتح الحاسبات</a>
      </div>

      <details>
        <summary>
          شرح + مثال
          <span class="summary-meta">
            <span class="badge">تفاصيل</span>
          </span>
        </summary>

        <p class="card-text"><strong>مثال رمزي:</strong> ${escapeHtml(f.example || "—")}</p>
        <p class="why"><strong>لماذا تهم؟</strong> ${escapeHtml(f.why || "—")}</p>

        ${f.extraLinkText ? `
          <p class="card-text muted">
            ملاحظة: يوجد نموذج رياضي متقدم لمخاطر الإفلاس (advanced) لكن لم يتم تطبيقه هنا لتجنب حسابات ثقيلة داخل الموقع التعليمي.
          </p>` : ""
        }
      </details>
    `;

    return el;
  }

  function renderFormulas() {
    const grid = $("#formulaGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const frag = document.createDocumentFragment();
    formulas.forEach((f) => frag.appendChild(createFormulaCard(f)));
    grid.appendChild(frag);

    // bind copy buttons
    $$(".js-copy-formula", grid).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const text = btn.getAttribute("data-formula") || "";
        await copyText(text);
      });
    });

    updateCount();
  }

  function updateCount(filteredCount) {
    const total = formulas.length;
    const shown = typeof filteredCount === "number" ? filteredCount : total;
    const el = $("#resultCount");
    if (el) el.textContent = `المعادلات المعروضة: ${shown} / ${total}`;
  }

  // ---------- Search ----------
  function initSearch() {
    const input = $("#searchInput");
    const clearBtn = $("#clearSearch");
    const grid = $("#formulaGrid");
    if (!input || !grid) return;

    function applyFilter() {
      const q = (input.value || "").trim().toLowerCase();
      const cards = $$(".formula-card", grid);
      let shown = 0;

      cards.forEach((card) => {
        const hay = (card.getAttribute("data-search") || "");
        const match = q === "" || hay.includes(q);
        card.style.display = match ? "" : "none";
        if (match) shown++;
      });

      updateCount(shown);
    }

    input.addEventListener("input", applyFilter);

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        input.focus();
        applyFilter();
      });
    }

    // Initial
    applyFilter();
  }

  // ---------- Expand/Collapse all formula details ----------
  function initDetailsControls() {
    const expand = $("#expandAll");
    const collapse = $("#collapseAll");
    const grid = $("#formulaGrid");
    if (!grid) return;

    function setAll(open) {
      $$(".formula-card details", grid).forEach((d) => {
        d.open = open;
      });
      showToast(open ? "تم توسيع التفاصيل" : "تم طيّ التفاصيل");
    }

    if (ex
