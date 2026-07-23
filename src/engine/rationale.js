export function generateRationale(stock, answers) {
  const parts = [];
  const partsBn = [];

  // Stats-based value rationale
  if (stock.percentile5Y != null && stock.percentile5Y > 0) {
    if (stock.percentile5Y <= 15) {
      parts.push(
        `Currently at the ${Math.round(stock.percentile5Y)}th percentile of its 5-year price range — historically very cheap.`
      );
      partsBn.push(
        `বর্তমানে ৫ বছরের মূল্য পরিসরের ${Math.round(stock.percentile5Y)}তম পার্সেন্টাইলে — ঐতিহাসিকভাবে অনেক সস্তা।`
      );
    } else if (stock.percentile5Y <= 35) {
      parts.push(
        `Trading below its 5-year median price — good entry point at the ${Math.round(stock.percentile5Y)}th percentile.`
      );
      partsBn.push(
        `৫ বছরের মধ্যমূল্যের নিচে লেনদেন হচ্ছে — ${Math.round(stock.percentile5Y)}তম পার্সেন্টাইলে ভালো প্রবেশ সুযোগ।`
      );
    } else if (stock.percentile5Y >= 85) {
      parts.push(
        `Trading near its 5-year high (${Math.round(stock.percentile5Y)}th percentile) — limited upside, but momentum is strong.`
      );
      partsBn.push(
        `৫ বছরের সর্বোচ্চের কাছে (${Math.round(stock.percentile5Y)}তম পার্সেন্টাইল) লেনদেন — সীমিত ঊর্ধ্বগতি, তবে গতি শক্তিশালী।`
      );
    }
  }

  // Price vs median insight
  if (stock.priceVsMedian5Y && stock.priceVsMedian5Y < 0.7) {
    const discount = Math.round((1 - stock.priceVsMedian5Y) * 100);
    parts.push(`${discount}% below its 5-year median — potential mean-reversion upside.`);
    partsBn.push(`৫ বছরের মধ্যমূল্য থেকে ${discount}% কম — গড়ে ফেরত আসার সম্ভাবনা।`);
  }

  // Volatility warning
  if (stock.volatilityAnnual > 45) {
    parts.push('High volatility stock — expect significant price swings.');
    partsBn.push('উচ্চ অস্থিরতার শেয়ার — উল্লেখযোগ্য দাম ওঠানামা আশা করুন।');
  }

  // 52-week range (kept as supplementary)
  if (stock.week52High && stock.week52Low && stock.week52High > stock.week52Low) {
    const range = stock.week52High - stock.week52Low;
    const position = (stock.week52High - stock.currentPrice) / range;
    const dropFromHigh = Math.round(((stock.week52High - stock.currentPrice) / stock.week52High) * 100);
    if (position >= 0.75) {
      parts.push(
        `Near its 52-week low (৳${stock.week52Low}) — ${dropFromHigh}% below 52W high.`
      );
      partsBn.push(
        `৫২-সপ্তাহের সর্বনিম্নের (৳${stock.week52Low}) কাছে — ৫২ সপ্তাহের সর্বোচ্চ থেকে ${dropFromHigh}% কম।`
      );
    }
  }

  if (answers.goal === 'income' && stock.dividendYield >= 4) {
    parts.push('Strong dividend yield aligns with your income goal.');
    partsBn.push('শক্তিশালী লভ্যাংশ প্রদান আপনার আয়ের লক্ষ্যের সাথে সামঞ্জস্যপূর্ণ।');
  } else if (answers.goal === 'income' && stock.dividendYield >= 2) {
    parts.push('Decent dividend yield supports your income objective.');
    partsBn.push('ভালো লভ্যাংশ প্রদান আপনার আয়ের উদ্দেশ্যকে সমর্থন করে।');
  } else if (answers.goal === 'wealth' && stock.growthPotential === 'high') {
    parts.push('High growth potential supports long-term wealth building.');
    partsBn.push('উচ্চ প্রবৃদ্ধির সম্ভাবনা দীর্ঘমেয়াদী সম্পদ গঠনে সহায়ক।');
  } else if (answers.goal === 'wealth') {
    parts.push('Solid historical returns make it a good candidate for wealth growth.');
    partsBn.push('শক্তিশালী ঐতিহাসিক রিটার্ন সম্পদ বৃদ্ধির জন্য উপযুক্ত।');
  } else if (answers.goal === 'quick' && stock.historicalReturn1Y >= 15) {
    parts.push('Strong recent performance suits your short-term gain strategy.');
    partsBn.push(
      'সাম্প্রতিক শক্তিশালী পারফরম্যান্স আপনার স্বল্পমেয়াদী লাভের কৌশলের জন্য উপযুক্ত।'
    );
  } else if (answers.goal === 'quick') {
    parts.push('Potential for quick returns based on recent market activity.');
    partsBn.push('সাম্প্রতিক বাজার কার্যক্রমের ভিত্তিতে দ্রুত রিটার্নের সম্ভাবনা।');
  }

  if (answers.risk === 'conservative' && stock.riskLevel <= 2) {
    parts.push('Low risk profile suits conservative investors.');
    partsBn.push('কম ঝুঁকির প্রোফাইল রক্ষণশীল বিনিয়োগকারীদের জন্য উপযুক্ত।');
  } else if (
    answers.risk === 'moderate' &&
    stock.riskLevel >= 2 &&
    stock.riskLevel <= 3
  ) {
    parts.push('Balanced risk level matches your moderate risk appetite.');
    partsBn.push(
      'সুষম ঝুঁকির মাত্রা আপনার মধ্যম ঝুঁকি গ্রহণের ক্ষমতার সাথে মানানসই।'
    );
  } else if (answers.risk === 'aggressive' && stock.riskLevel >= 4) {
    parts.push('Higher risk aligns with your aggressive investment style.');
    partsBn.push(
      'উচ্চ ঝুঁকি আপনার আক্রমণাত্মক বিনিয়োগ শৈলীর সাথে সামঞ্জস্যপূর্ণ।'
    );
  }

  if (answers.horizon === 'long' && stock.historicalReturn5Y >= 12) {
    parts.push('Proven long-term track record strengthens this pick.');
    partsBn.push(
      'প্রমাণিত দীর্ঘমেয়াদী ট্র্যাক রেকর্ড এই নির্বাচনকে শক্তিশালী করে।'
    );
  } else if (answers.horizon === 'short' || answers.goal === 'quick') {
    // Momentum-based rationale for short-term seekers
    const r15d = stock.return15d || 0;
    const r1m = stock.return1m || 0;
    const r1y = stock.historicalReturn1Y || 0;

    if (r15d > 5 && r1m > 8) {
      parts.push(`Strong upward momentum: +${r15d.toFixed(1)}% in 15 days, +${r1m.toFixed(1)}% this month.`);
      partsBn.push(`শক্তিশালী গতি: ১৫ দিনে +${r15d.toFixed(1)}%, এই মাসে +${r1m.toFixed(1)}%।`);
    } else if (r15d > 2 && r1m > 3) {
      parts.push(`Positive recent trend: +${r15d.toFixed(1)}% in 15 days, +${r1m.toFixed(1)}% this month.`);
      partsBn.push(`সাম্প্রতিক ইতিবাচক প্রবণতা: ১৫ দিনে +${r15d.toFixed(1)}%, এই মাসে +${r1m.toFixed(1)}%।`);
    } else if (r1y > 15 && r1m > 0) {
      parts.push(`Strong yearly trend (+${r1y.toFixed(1)}%) with continued positive movement.`);
      partsBn.push(`শক্তিশালী বার্ষিক প্রবণতা (+${r1y.toFixed(1)}%) এবং ধারাবাহিক গতি।`);
    }

    if (stock.dividendYield >= 3 && answers.horizon === 'short') {
      parts.push('Regular dividends provide near-term cash flow.');
      partsBn.push('নিয়মিত লভ্যাংশ নিকটমেয়াদী নগদ প্রবাহ প্রদান করে।');
    }
  } else if (answers.horizon === 'medium') {
    parts.push('Good balance of growth and stability for medium-term holding.');
    partsBn.push(
      'মধ্যমেয়াদী ধারণের জন্য প্রবৃদ্ধি ও স্থিতিশীলতার ভালো ভারসাম্য।'
    );
  }

  if (stock.marketCap === 'large') {
    parts.push('Large-cap stability adds portfolio resilience.');
    partsBn.push('লার্জ-ক্যাপ স্থিতিশীলতা পোর্টফোলিওতে সহনশীলতা যোগ করে।');
  }

  if (parts.length === 0) {
    parts.push(
      'Well-rounded stock with good overall characteristics for your profile.'
    );
    partsBn.push(
      'আপনার প্রোফাইলের জন্য ভালো সামগ্রিক বৈশিষ্ট্যসম্পন্ন শেয়ার।'
    );
  }

  return {
    rationale: parts.join(' '),
    rationaleBn: partsBn.join(' '),
  };
}
