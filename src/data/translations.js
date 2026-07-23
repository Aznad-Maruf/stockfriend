export const translations = {
  en: {
    app: {
      name: 'StockFriend',
      tagline: 'Your Smart Stock Investment Companion',
      description: 'Get personalized stock recommendations for Bangladesh\'s DSE & CSE based on your investment profile.',
    },
    landing: {
      heroTitle: 'Invest Smarter in Bangladesh\'s Stock Market',
      heroSubtitle: 'Answer a few simple questions and get personalized stock recommendations tailored to your goals, risk tolerance, and budget.',
      ctaButton: 'Start Assessment',
      continueCta: 'Continue Previous Assessment',
      freshCta: 'Start Fresh',
      features: {
        personalized: { title: 'Personalized', desc: 'Recommendations tailored to your unique investment profile' },
        bilingual: { title: 'Bilingual', desc: 'Full support in English and বাংলা' },
        free: { title: 'Free Forever', desc: 'No hidden charges, no sign-up required' },
      },
      disclaimer: 'This tool is for educational and informational purposes only. It does not constitute professional financial advice. Always consult a licensed financial advisor before making investment decisions.',
    },
    wizard: {
      progress: 'Step {current} of {total}',
      back: 'Back',
      next: 'Next',
      submit: 'Get Recommendations',
      questions: {
        experience: {
          title: 'What is your investment experience level?',
          subtitle: 'This helps us tailor the complexity of our recommendations.',
          options: {
            beginner: { label: 'Beginner', desc: 'I\'m new to stock investing' },
            intermediate: { label: 'Intermediate', desc: 'I understand the basics and have invested before' },
            advanced: { label: 'Advanced', desc: 'I actively trade and understand market analysis' },
          },
        },
        risk: {
          title: 'What is your risk tolerance?',
          subtitle: 'How much risk are you comfortable with?',
          options: {
            conservative: { label: 'Conservative', desc: 'I prefer safe, steady returns' },
            moderate: { label: 'Moderate', desc: 'I\'m okay with some ups and downs' },
            aggressive: { label: 'Aggressive', desc: 'I\'m willing to take high risks for high rewards' },
          },
        },
        horizon: {
          title: 'What is your investment horizon?',
          subtitle: 'How long do you plan to hold your investments?',
          options: {
            short: { label: 'Short-term', desc: 'Less than 1 year' },
            medium: { label: 'Medium-term', desc: '1 to 3 years' },
            long: { label: 'Long-term', desc: 'More than 3 years' },
          },
        },
        budget: {
          title: 'What is your investment budget?',
          subtitle: 'Enter the amount you plan to invest (in BDT).',
          placeholder: 'Enter amount',
          currency: '৳',
          presets: ['50,000', '1,00,000', '5,00,000', '10,00,000'],
        },
        goal: {
          title: 'What is your primary financial goal?',
          subtitle: 'This helps us prioritize the right kind of stocks for you.',
          options: {
            wealth: { label: 'Wealth Building', desc: 'Grow my money over time through capital appreciation' },
            income: { label: 'Passive Income', desc: 'Earn regular dividends from my investments' },
            quick: { label: 'Quick Gains', desc: 'Maximize short-term profits' },
          },
        },
        sectors: {
          title: 'Which sectors are you interested in?',
          subtitle: 'Select one or more sectors, or skip to consider all.',
          selectAll: 'No Preference (All Sectors)',
        },
      },
    },
    results: {
      title: 'Your Personalized Recommendations',
      subtitle: 'Based on your investment profile, here are our top picks.',
      profileSummary: 'Your Profile',
      riskLabel: 'Risk Tolerance',
      horizonLabel: 'Investment Horizon',
      budgetLabel: 'Budget',
      goalLabel: 'Goal',
      stockCard: {
        currentPrice: 'Current Price',
        allocation: 'Suggested Allocation',
        tentativeReturn: 'Tentative Return',
        riskLevel: 'Risk Level',
        rationale: 'Why this stock?',
      },
      riskLevels: {
        1: 'Very Low',
        2: 'Low',
        3: 'Moderate',
        4: 'High',
        5: 'Very High',
      },
      portfolio: {
        title: 'Portfolio Overview',
        totalInvestment: 'Total Investment',
        projectedValue: 'Projected Value',
        projectedGain: 'Projected Gain',
        sectorDiversification: 'Sector Diversification',
      },
      retake: 'Retake Assessment',
      disclaimer: 'Disclaimer: These recommendations are generated algorithmically based on historical data and your stated preferences. They are for educational purposes only and do not constitute financial advice. Past performance does not guarantee future results. Always do your own research and consult a licensed financial advisor.',
    },
    header: {
      theme: { light: 'Light', dark: 'Dark' },
      language: { en: 'EN', bn: 'বাং' },
    },
  },
  bn: {
    app: {
      name: 'বিনিয়োগবন্ধু',
      tagline: 'আপনার স্মার্ট শেয়ার বিনিয়োগ সঙ্গী',
      description: 'আপনার বিনিয়োগ প্রোফাইলের উপর ভিত্তি করে বাংলাদেশের ডিএসই ও সিএসই-এর জন্য ব্যক্তিগতকৃত শেয়ার সুপারিশ পান।',
    },
    landing: {
      heroTitle: 'বাংলাদেশের শেয়ার বাজারে বুদ্ধিমত্তার সাথে বিনিয়োগ করুন',
      heroSubtitle: 'কয়েকটি সহজ প্রশ্নের উত্তর দিন এবং আপনার লক্ষ্য, ঝুঁকি সহনশীলতা ও বাজেট অনুযায়ী ব্যক্তিগতকৃত শেয়ার সুপারিশ পান।',
      ctaButton: 'মূল্যায়ন শুরু করুন',
      continueCta: 'পূর্ববর্তী মূল্যায়ন চালিয়ে যান',
      freshCta: 'নতুন করে শুরু করুন',
      features: {
        personalized: { title: 'ব্যক্তিগতকৃত', desc: 'আপনার বিনিয়োগ প্রোফাইল অনুযায়ী তৈরি সুপারিশ' },
        bilingual: { title: 'দ্বিভাষিক', desc: 'ইংরেজি ও বাংলা উভয় ভাষায় পূর্ণ সমর্থন' },
        free: { title: 'চিরকাল বিনামূল্যে', desc: 'কোনো লুকানো চার্জ নেই, সাইন-আপের প্রয়োজন নেই' },
      },
      disclaimer: 'এই টুলটি শুধুমাত্র শিক্ষামূলক ও তথ্যমূলক উদ্দেশ্যে। এটি পেশাদার আর্থিক পরামর্শ নয়। বিনিয়োগের সিদ্ধান্ত নেওয়ার আগে সবসময় একজন লাইসেন্সপ্রাপ্ত আর্থিক উপদেষ্টার সাথে পরামর্শ করুন।',
    },
    wizard: {
      progress: 'ধাপ {current}/{total}',
      back: 'পেছনে',
      next: 'পরবর্তী',
      submit: 'সুপারিশ দেখুন',
      questions: {
        experience: {
          title: 'শেয়ার বিনিয়োগে আপনার অভিজ্ঞতা কতটুকু?',
          subtitle: 'এটি আমাদের সুপারিশের জটিলতা নির্ধারণে সাহায্য করবে।',
          options: {
            beginner: { label: 'নতুন', desc: 'শেয়ার বিনিয়োগে আমি একেবারেই নতুন' },
            intermediate: { label: 'মধ্যবর্তী', desc: 'আমি মৌলিক বিষয়গুলো বুঝি এবং আগে বিনিয়োগ করেছি' },
            advanced: { label: 'অভিজ্ঞ', desc: 'আমি সক্রিয়ভাবে ট্রেড করি এবং বাজার বিশ্লেষণ বুঝি' },
          },
        },
        risk: {
          title: 'আপনার ঝুঁকি সহনশীলতা কতটুকু?',
          subtitle: 'আপনি কতটুকু ঝুঁকি নিতে স্বাচ্ছন্দ্য বোধ করেন?',
          options: {
            conservative: { label: 'রক্ষণশীল', desc: 'আমি নিরাপদ ও স্থিতিশীল রিটার্ন পছন্দ করি' },
            moderate: { label: 'মধ্যপন্থী', desc: 'কিছুটা ওঠানামা আমার কাছে গ্রহণযোগ্য' },
            aggressive: { label: 'ঝুঁকিপ্রবণ', desc: 'বেশি লাভের জন্য বেশি ঝুঁকি নিতে আমি রাজি' },
          },
        },
        horizon: {
          title: 'আপনার বিনিয়োগের সময়সীমা কত?',
          subtitle: 'আপনি কতদিন বিনিয়োগ ধরে রাখার পরিকল্পনা করছেন?',
          options: {
            short: { label: 'স্বল্পমেয়াদি', desc: '১ বছরের কম' },
            medium: { label: 'মধ্যমেয়াদি', desc: '১ থেকে ৩ বছর' },
            long: { label: 'দীর্ঘমেয়াদি', desc: '৩ বছরের বেশি' },
          },
        },
        budget: {
          title: 'আপনার বিনিয়োগের বাজেট কত?',
          subtitle: 'আপনি কত টাকা বিনিয়োগ করতে চান (বিডিটি-তে) তা লিখুন।',
          placeholder: 'পরিমাণ লিখুন',
          currency: '৳',
          presets: ['৫০,০০০', '১,০০,০০০', '৫,০০,০০০', '১০,০০,০০০'],
        },
        goal: {
          title: 'আপনার প্রধান আর্থিক লক্ষ্য কী?',
          subtitle: 'এটি আপনার জন্য সঠিক ধরনের শেয়ার বাছাই করতে সাহায্য করবে।',
          options: {
            wealth: { label: 'সম্পদ বৃদ্ধি', desc: 'মূলধন বৃদ্ধির মাধ্যমে সময়ের সাথে আমার অর্থ বাড়াতে চাই' },
            income: { label: 'প্যাসিভ আয়', desc: 'বিনিয়োগ থেকে নিয়মিত ডিভিডেন্ড আয় করতে চাই' },
            quick: { label: 'দ্রুত লাভ', desc: 'স্বল্পমেয়াদে সর্বোচ্চ মুনাফা অর্জন করতে চাই' },
          },
        },
        sectors: {
          title: 'আপনি কোন সেক্টরগুলোতে আগ্রহী?',
          subtitle: 'এক বা একাধিক সেক্টর নির্বাচন করুন, অথবা সব সেক্টর বিবেচনা করতে এড়িয়ে যান।',
          selectAll: 'কোনো পছন্দ নেই (সকল সেক্টর)',
        },
      },
    },
    results: {
      title: 'আপনার ব্যক্তিগতকৃত সুপারিশ',
      subtitle: 'আপনার বিনিয়োগ প্রোফাইলের ভিত্তিতে আমাদের সেরা বাছাইগুলো এখানে।',
      profileSummary: 'আপনার প্রোফাইল',
      riskLabel: 'ঝুঁকি সহনশীলতা',
      horizonLabel: 'বিনিয়োগের সময়সীমা',
      budgetLabel: 'বাজেট',
      goalLabel: 'লক্ষ্য',
      stockCard: {
        currentPrice: 'বর্তমান মূল্য',
        allocation: 'প্রস্তাবিত বরাদ্দ',
        tentativeReturn: 'সম্ভাব্য রিটার্ন',
        riskLevel: 'ঝুঁকির মাত্রা',
        rationale: 'কেন এই শেয়ার?',
      },
      riskLevels: {
        1: 'অত্যন্ত কম',
        2: 'কম',
        3: 'মধ্যম',
        4: 'বেশি',
        5: 'অত্যন্ত বেশি',
      },
      portfolio: {
        title: 'পোর্টফোলিও সারসংক্ষেপ',
        totalInvestment: 'মোট বিনিয়োগ',
        projectedValue: 'প্রত্যাশিত মূল্য',
        projectedGain: 'প্রত্যাশিত লাভ',
        sectorDiversification: 'সেক্টর বৈচিত্র্য',
      },
      retake: 'পুনরায় মূল্যায়ন করুন',
      disclaimer: 'দাবিত্যাগ: এই সুপারিশগুলো ঐতিহাসিক তথ্য ও আপনার দেওয়া পছন্দের ভিত্তিতে অ্যালগরিদমের মাধ্যমে তৈরি করা হয়েছে। এগুলো শুধুমাত্র শিক্ষামূলক উদ্দেশ্যে এবং কোনো আর্থিক পরামর্শ হিসেবে বিবেচিত নয়। অতীতের পারফরম্যান্স ভবিষ্যতের ফলাফলের নিশ্চয়তা দেয় না। সবসময় নিজে গবেষণা করুন এবং একজন লাইসেন্সপ্রাপ্ত আর্থিক উপদেষ্টার পরামর্শ নিন।',
    },
    header: {
      theme: { light: 'লাইট', dark: 'ডার্ক' },
      language: { en: 'EN', bn: 'বাং' },
    },
  },
};

export const t = (translations, lang, path) => {
  return path.split('.').reduce((obj, key) => obj?.[key], translations[lang]);
};
