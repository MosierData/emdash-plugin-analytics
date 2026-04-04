import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePluginAPI } from '@emdash-cms/admin';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrackingValues {
  gtmEnabled: boolean;
  gtmId: string;
  ga4Enabled: boolean;
  ga4Id: string;
  metaEnabled: boolean;
  metaId: string;
  linkedinEnabled: boolean;
  linkedinId: string;
  tiktokEnabled: boolean;
  tiktokId: string;
  bingEnabled: boolean;
  bingId: string;
  pinterestEnabled: boolean;
  pinterestId: string;
  nextdoorEnabled: boolean;
  nextdoorId: string;
}

type PlatformId =
  | 'gtm'
  | 'ga4'
  | 'meta'
  | 'linkedin'
  | 'tiktok'
  | 'bing'
  | 'pinterest'
  | 'nextdoor';

interface HelpSection {
  title: string;
  content: React.ReactNode;
}

// ─── Help Content ─────────────────────────────────────────────────────────────

const HELP_CONTENT: Record<PlatformId, HelpSection[]> = {
  gtm: [
    {
      title: 'What is this?',
      content: (
        <p style={{ margin: 0 }}>
          Google Tag Manager is a free tool from Google that acts as a central control panel for all the
          tracking scripts on your website. Instead of adding each tracking code (Google Analytics, Meta
          Pixel, LinkedIn, etc.) to your site individually, you put them all inside one GTM "container"
          and manage them from a single dashboard.
        </p>
      ),
    },
    {
      title: 'Why would I use it?',
      content: (
        <p style={{ margin: 0 }}>
          If you or your agency already use GTM, this is the way to go. It means you can add, edit, or
          remove any tracking code from the GTM dashboard without ever touching your website again.
          It's also the cleanest option if you're running multiple tracking tools and want precise control
          over when and how each one fires.
        </p>
      ),
    },
    {
      title: 'When should I skip this?',
      content: (
        <p style={{ margin: 0 }}>
          If you don't have a GTM account and you're not sure what this is, you probably don't need it.
          You can enable Google Analytics, Meta Pixel, and LinkedIn directly using the toggles below —
          no GTM required.
        </p>
      ),
    },
    {
      title: "Important — don't double up",
      content: (
        <p style={{ margin: 0 }}>
          If you turn on GTM here <strong>and</strong> you also enable Google Analytics, Meta Pixel, or
          LinkedIn directly in this plugin, those scripts will load twice. That means every pageview and
          every conversion gets counted twice, which makes your data unreliable. Pick one approach: manage
          everything through GTM, <strong>or</strong> enable each platform individually below. Not both.
        </p>
      ),
    },
    {
      title: 'How to find your GTM ID',
      content: (
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Go to tagmanager.google.com and sign in</li>
          <li>Select your account and container</li>
          <li>Your GTM ID is in the top-right corner of the screen — it looks like <strong>GTM-XXXXXXX</strong></li>
          <li>Paste that ID into the field below and flip the toggle to enable</li>
        </ol>
      ),
    },
  ],
  ga4: [
    {
      title: 'What is this?',
      content: (
        <p style={{ margin: 0 }}>
          Google Analytics 4 is Google's analytics platform. It tracks who visits your website, how they
          found you, what they do while they're there, and whether they take actions that matter to your
          business — like filling out a contact form or calling your phone number.
        </p>
      ),
    },
    {
      title: 'Why would I use it?',
      content: (
        <p style={{ margin: 0 }}>
          If you want to understand your website traffic, this is the foundation. GA4 automatically tracks
          page views, session duration, traffic sources, device types, and geographic location. You can add
          more advanced tracking on top of that (form submissions, button clicks, purchases), but the basics
          work right out of the box.
        </p>
      ),
    },
    {
      title: 'When should I skip this?',
      content: (
        <p style={{ margin: 0 }}>
          Skip this toggle if you're already sending GA4 data through Google Tag Manager. Enabling it here
          and in GTM will count every visitor twice, which inflates all of your numbers. If you're not sure,
          check your GTM container for a tag called "Google Analytics: GA4 Configuration" or "Google Tag" —
          if it's there, leave this toggle off.
        </p>
      ),
    },
    {
      title: 'How to find your Measurement ID',
      content: (
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Go to analytics.google.com and sign in</li>
          <li>Select your property (or create one if you haven't set one up yet)</li>
          <li>Go to <strong>Admin → Data Streams</strong> and click on your web stream</li>
          <li>Your Measurement ID is at the top of the screen — it looks like <strong>G-XXXXXXXXXX</strong></li>
          <li>Paste it into the field below and flip the toggle to enable</li>
        </ol>
      ),
    },
  ],
  meta: [
    {
      title: 'What is this?',
      content: (
        <p style={{ margin: 0 }}>
          The Meta Pixel is a small piece of tracking code from Meta that connects your website to your
          Facebook and Instagram advertising accounts. It's how Meta knows what happens on your site after
          someone clicks one of your ads.
        </p>
      ),
    },
    {
      title: 'Why would I use it?',
      content: (
        <p style={{ margin: 0 }}>
          Without the Pixel installed, Meta's ad platform has no idea what happens after someone clicks your
          ad. It can't tell which ads are producing leads, it can't build retargeting audiences from your
          website visitors, and it can't optimize delivery toward people who are likely to convert. If you're
          running Facebook or Instagram ads — or if you plan to — the Pixel is essential.
          <br /><br />
          Even if you're not running ads yet, there's value in installing it now. The Pixel starts collecting
          visitor data immediately, so by the time you're ready to run your first campaign, Meta already has
          an audience to work with.
        </p>
      ),
    },
    {
      title: 'When should I skip this?',
      content: (
        <p style={{ margin: 0 }}>
          If you already have the Meta Pixel firing through Google Tag Manager, don't enable it here. You'd
          be loading it twice. Check your GTM container for a tag called "Meta Pixel" or "Facebook Pixel" —
          if it exists, leave this toggle off and manage it in GTM.
        </p>
      ),
    },
    {
      title: 'How to find your Pixel ID',
      content: (
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Go to business.facebook.com and open <strong>Events Manager</strong></li>
          <li>Select your Pixel (or create one under <strong>Connect Data Sources → Web</strong>)</li>
          <li>Your Pixel ID is the number at the top of the Pixel detail screen — it looks like <strong>123456789012345</strong></li>
          <li>Paste it into the field below and flip the toggle to enable</li>
        </ol>
      ),
    },
  ],
  linkedin: [
    {
      title: 'What is this?',
      content: (
        <p style={{ margin: 0 }}>
          The LinkedIn Insight Tag is LinkedIn's version of a tracking pixel. It's a lightweight script that
          connects your website to your LinkedIn Campaign Manager account.
        </p>
      ),
    },
    {
      title: 'Why would I use it?',
      content: (
        <p style={{ margin: 0 }}>
          The Insight Tag does two things. First, it powers LinkedIn ad features — retargeting website
          visitors, tracking conversions from LinkedIn ads, and optimizing ad delivery. Second, and this is
          the part most people don't know about, it unlocks LinkedIn's <strong>Website Demographics</strong>{' '}
          report. That report shows you the job titles, industries, company sizes, and seniority levels of
          the LinkedIn members visiting your website. If you sell to other businesses, that report alone is
          worth the install — even if you never run a LinkedIn ad.
        </p>
      ),
    },
    {
      title: 'When should I skip this?',
      content: (
        <p style={{ margin: 0 }}>
          If you already have the LinkedIn Insight Tag firing through Google Tag Manager, don't enable it
          here. Check your GTM container for a tag called "LinkedIn Insight Tag" before proceeding.
        </p>
      ),
    },
    {
      title: 'How to find your Partner ID',
      content: (
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Go to linkedin.com/campaignmanager and sign in</li>
          <li>Select your ad account</li>
          <li>In the left navigation, go to <strong>Analyze → Insight Tag</strong></li>
          <li>Your Partner ID is the number shown on that page — it looks like <strong>1234567</strong></li>
          <li>Paste it into the field below and flip the toggle to enable</li>
        </ol>
      ),
    },
  ],
  tiktok: [
    {
      title: 'What is this?',
      content: (
        <p style={{ margin: 0 }}>
          The TikTok Pixel is a tracking code from TikTok that connects your website to your TikTok Ads
          Manager account. It works the same way the Meta Pixel does for Facebook and Instagram — it watches
          what happens on your site and reports back to TikTok so the ad platform can do its job.
        </p>
      ),
    },
    {
      title: 'Why would I use it?',
      content: (
        <p style={{ margin: 0 }}>
          If you run or plan to run TikTok ads, this is how TikTok knows whether your ads are actually
          working. Without the Pixel, TikTok can't track conversions, can't build retargeting audiences from
          your website visitors, and can't optimize ad delivery toward people who are likely to become
          customers. You're essentially paying for traffic with no feedback loop.
          <br /><br />
          TikTok's ad platform has gotten significantly better at reaching local service audiences —
          homeowners, people searching for contractors, anyone in a buying mindset. If your customers skew
          under 50 and you're spending on any paid social, TikTok is worth testing. Installing the Pixel now
          means the platform is already collecting data when you're ready to launch your first campaign.
        </p>
      ),
    },
    {
      title: 'When should I skip this?',
      content: (
        <p style={{ margin: 0 }}>
          If you already have the TikTok Pixel firing through Google Tag Manager, don't enable it here.
          Check your GTM container for a tag called "TikTok Pixel" or a custom HTML tag that references
          analytics.tiktok.com — if it's there, leave this toggle off.
        </p>
      ),
    },
    {
      title: 'How to find your Pixel ID',
      content: (
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Go to ads.tiktok.com and sign in to TikTok Ads Manager</li>
          <li>Navigate to <strong>Assets → Events → Web Events</strong></li>
          <li>Select your Pixel (or create one if you haven't set one up yet)</li>
          <li>Your Pixel ID is the number shown at the top of the Pixel detail page — it looks like <strong>CXXXXXXXXXXXXXXXXX</strong></li>
          <li>Paste it into the field below and flip the toggle to enable</li>
        </ol>
      ),
    },
  ],
  bing: [
    {
      title: 'What is this?',
      content: (
        <p style={{ margin: 0 }}>
          The UET (Universal Event Tracking) tag is Microsoft Advertising's tracking pixel. It connects your
          website to your Microsoft Ads account — the platform that runs ads on Bing, Yahoo, DuckDuckGo, and
          across Microsoft's partner network.
        </p>
      ),
    },
    {
      title: 'Why would I use it?',
      content: (
        <p style={{ margin: 0 }}>
          If you're running Microsoft Ads (formerly Bing Ads), this is how the platform tracks conversions
          and builds remarketing audiences. Without it, you can't see which ads and keywords are producing
          leads, and you can't retarget people who visited your site but didn't convert.
          <br /><br />
          A lot of businesses overlook Microsoft Ads because the volume is smaller than Google. But that's
          exactly why it works — less competition usually means cheaper cost-per-click, and the audience
          tends to skew older and higher income. For home services, legal, medical, and professional
          services, it's often one of the best-performing paid channels dollar-for-dollar. If you're already
          running Google Ads, adding Bing is usually an easy win.
        </p>
      ),
    },
    {
      title: 'When should I skip this?',
      content: (
        <p style={{ margin: 0 }}>
          If you already have the UET tag firing through Google Tag Manager, don't enable it here. Check
          your GTM container for a tag called "Microsoft Advertising Universal Event Tracking" or a custom
          HTML tag referencing bat.bing.com — if it exists, leave this toggle off.
        </p>
      ),
    },
    {
      title: 'How to find your UET Tag ID',
      content: (
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Go to ads.microsoft.com and sign in</li>
          <li>In the top navigation, go to <strong>Tools → UET tag</strong></li>
          <li>Select your tag (or create one if you haven't set one up yet)</li>
          <li>Your UET Tag ID is the number shown in the tag details — it looks like <strong>12345678</strong></li>
          <li>Paste it into the field below and flip the toggle to enable</li>
        </ol>
      ),
    },
  ],
  pinterest: [
    {
      title: 'What is this?',
      content: (
        <p style={{ margin: 0 }}>
          The Pinterest Tag is a tracking code that connects your website to your Pinterest Ads account. It
          tracks what visitors do on your site after interacting with your Pins or ads.
        </p>
      ),
    },
    {
      title: 'Why would I use it?',
      content: (
        <p style={{ margin: 0 }}>
          Pinterest is different from most ad platforms because people use it to plan — they're actively
          searching for ideas, products, and services they intend to buy. That makes Pinterest traffic
          unusually high-intent compared to other social platforms. The Pinterest Tag lets you track which
          Pins and ads are driving real actions on your site, build retargeting audiences from your visitors,
          and help Pinterest's algorithm find more people like your best customers.
          <br /><br />
          This is especially valuable if your business is visual — home renovation, landscaping, interior
          design, custom builds, real estate, or anything where before-and-after photos or project galleries
          are part of how you sell. If your customers pin ideas before they hire, Pinterest is worth your
          attention.
        </p>
      ),
    },
    {
      title: 'When should I skip this?',
      content: (
        <p style={{ margin: 0 }}>
          If you already have the Pinterest Tag firing through Google Tag Manager, don't enable it here.
          Check your GTM container for a tag called "Pinterest Tag" or a custom HTML tag referencing
          ct.pinterest.com — if it exists, leave this toggle off.
        </p>
      ),
    },
    {
      title: 'How to find your Pinterest Tag ID',
      content: (
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Go to ads.pinterest.com and sign in</li>
          <li>In the top navigation, click <strong>Ads → Conversions</strong></li>
          <li>Select your tag (or create one if you haven't set one up yet)</li>
          <li>Your Tag ID is the number shown in the tag details — it looks like <strong>1234567890123</strong></li>
          <li>Paste it into the field below and flip the toggle to enable</li>
        </ol>
      ),
    },
  ],
  nextdoor: [
    {
      title: 'What is this?',
      content: (
        <p style={{ margin: 0 }}>
          The Nextdoor Conversion Pixel is a tracking code from Nextdoor's advertising platform. It connects
          your website activity to your Nextdoor Ads Manager account.
        </p>
      ),
    },
    {
      title: 'Why would I use it?',
      content: (
        <p style={{ margin: 0 }}>
          Nextdoor is the neighborhood-level social network — and for local service businesses, it's one of
          the most targeted advertising platforms available. The people on Nextdoor are homeowners in specific
          neighborhoods, actively talking about and recommending local businesses. The Conversion Pixel lets
          you track which Nextdoor ads are driving visits and conversions on your website, build retargeting
          audiences, and measure your actual return on Nextdoor ad spend.
          <br /><br />
          If your business serves a specific geographic area — plumbing, HVAC, roofing, landscaping,
          cleaning, legal, dental, or any other local service — Nextdoor puts your ads directly in front of
          the neighbors who need you. The Pixel is how you prove it's working.
        </p>
      ),
    },
    {
      title: 'When should I skip this?',
      content: (
        <p style={{ margin: 0 }}>
          If you already have the Nextdoor Pixel firing through Google Tag Manager, don't enable it here.
          Check your GTM container for a custom HTML tag referencing Nextdoor's tracking domain — if it's
          there, leave this toggle off.
        </p>
      ),
    },
    {
      title: 'How to find your Nextdoor Pixel ID',
      content: (
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Go to ads.nextdoor.com and sign in</li>
          <li>Navigate to <strong>Measurement → Nextdoor Pixel</strong></li>
          <li>Select your Pixel (or create one if you haven't set one up yet)</li>
          <li>Your Pixel ID is displayed on the setup page</li>
          <li>Paste it into the field below and flip the toggle to enable</li>
        </ol>
      ),
    },
  ],
};

// ─── SVG Logos ────────────────────────────────────────────────────────────────

const GtmLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L22 7.77V16.22L12 22L2 16.22V7.77L12 2Z" fill="#4285F4" />
    <circle cx="12" cy="12" r="4" fill="white" />
  </svg>
);

const Ga4Logo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="14" width="4" height="6" rx="1" fill="#F4B400" />
    <rect x="10" y="10" width="4" height="10" rx="1" fill="#E37400" />
    <rect x="17" y="4" width="4" height="16" rx="1" fill="#D93025" />
  </svg>
);

const MetaLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 8C5.79086 8 4 9.79086 4 12C4 14.2091 5.79086 16 8 16C9.5 16 10.5 15 12 13.5C13.5 12 14.5 8 16 8C18.2091 8 20 9.79086 20 12C20 14.2091 18.2091 16 16 16"
      stroke="#1877F2"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LinkedinLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#0A66C2" />
    <path d="M7 9H5V18H7V9Z" fill="white" />
    <circle cx="6" cy="6.5" r="1.5" fill="white" />
    <path d="M10 9H12V10.5C12.5 9.5 13.5 9 15 9C17.5 9 19 10.5 19 13.5V18H17V13.5C17 12 16.5 11 15 11C13.5 11 12 12 12 13.5V18H10V9Z" fill="white" />
  </svg>
);

const TiktokLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2H15C15 4 16 5 18 5V8C16 8 14 7 13 6V15C13 17.7614 10.7614 20 8 20C5.23858 20 3 17.7614 3 15C3 12.2386 5.23858 10 8 10V13C6.89543 13 6 13.8954 6 15C6 16.1046 6.89543 17 8 17C9.10457 17 10 16.1046 10 15V2H12Z"
      fill="#000000"
    />
  </svg>
);

const BingLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="8" height="8" fill="#F25022" />
    <rect x="13" y="3" width="8" height="8" fill="#7FBA00" />
    <rect x="3" y="13" width="8" height="8" fill="#00A4EF" />
    <rect x="13" y="13" width="8" height="8" fill="#FFB900" />
  </svg>
);

const PinterestLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#E60023" />
    <path
      d="M12 6C9.5 6 8 7.5 8 9.5C8 10.5 8.5 11.5 9.5 11.5C9.8 11.5 10 11.2 10 11C10 10.8 9.8 10.2 9.8 10C9.8 8.5 11 7.5 12.5 7.5C14 7.5 15 8.5 15 10C15 12 14 13.5 12.5 13.5C11.5 13.5 11 12.8 11 12C11 11 11.5 9.5 11.5 8.5C11.5 7.8 11 7 10 7C8.8 7 8 8 8 9.5C8 10.5 8.2 11.2 8.5 12C8.2 13.5 7.5 16 7.5 17.5C7.5 18 7.8 18.5 8 18.5C8.2 18.5 9.5 15 10 13.5C10.5 14.5 11.5 15 12.5 15C15 15 17 12.5 17 10C17 7.5 15 6 12 6Z"
      fill="white"
    />
  </svg>
);

const NextdoorLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L2 11H5V21H19V11H22L12 3Z" fill="#8ED500" />
    <path d="M12 8L16 11V18H8V11L12 8Z" fill="white" />
  </svg>
);

const PLATFORM_LOGOS: Record<PlatformId, React.FC<{ size?: number }>> = {
  gtm: GtmLogo,
  ga4: Ga4Logo,
  meta: MetaLogo,
  linkedin: LinkedinLogo,
  tiktok: TiktokLogo,
  bing: BingLogo,
  pinterest: PinterestLogo,
  nextdoor: NextdoorLogo,
};

// ─── Platform Definitions ─────────────────────────────────────────────────────

type PlatformDef = {
  id: PlatformId;
  title: string;
  color: string;
  placeholder: string;
  toggleKey: keyof TrackingValues;
  idKey: keyof TrackingValues;
  idLabel: string;
  tagline: string;
  quickAnswer: string;
};

const PLATFORMS: PlatformDef[] = [
  {
    id: 'gtm',
    title: 'Google Tag Manager (GTM)',
    color: '#4285F4',
    placeholder: 'GTM-XXXXXXX',
    toggleKey: 'gtmEnabled',
    idKey: 'gtmId',
    idLabel: 'Container ID',
    tagline: 'One container to manage all your tracking scripts — for agencies and power users.',
    quickAnswer:
      "Most small businesses don't need this. If your agency set up Google Tag Manager for you, use this. Otherwise, skip it and enable each platform individually below.",
  },
  {
    id: 'ga4',
    title: 'Google Analytics 4 (GA4)',
    color: '#E37400',
    placeholder: 'G-XXXXXXXXXX',
    toggleKey: 'ga4Enabled',
    idKey: 'ga4Id',
    idLabel: 'Measurement ID',
    tagline: 'See who visits your website, where they come from, and what they do.',
    quickAnswer:
      "If you want to understand your website traffic, turn this on. It's the most important tracking tool for any website. Skip it only if your agency manages it through Google Tag Manager.",
  },
  {
    id: 'meta',
    title: 'Meta (Facebook) Pixel',
    color: '#1877F2',
    placeholder: '123456789012345',
    toggleKey: 'metaEnabled',
    idKey: 'metaId',
    idLabel: 'Pixel ID',
    tagline: 'Connect your website to Facebook & Instagram ads so Meta can track what works.',
    quickAnswer:
      "Turn this on if you run Facebook or Instagram ads, or plan to. Even if you're not running ads yet, installing it now starts building your audience. Skip it if it's already in your Google Tag Manager.",
  },
  {
    id: 'linkedin',
    title: 'LinkedIn Insight Tag',
    color: '#0A66C2',
    placeholder: '1234567',
    toggleKey: 'linkedinEnabled',
    idKey: 'linkedinId',
    idLabel: 'Partner ID',
    tagline: 'Track LinkedIn ad performance and see which professionals visit your site.',
    quickAnswer:
      "Worth enabling if you sell to other businesses — even without ads, you get free data about which professionals visit your site. Skip it if it's already in your Google Tag Manager.",
  },
  {
    id: 'tiktok',
    title: 'TikTok Pixel',
    color: '#000000',
    placeholder: 'CXXXXXXXXXXXXXXXXX',
    toggleKey: 'tiktokEnabled',
    idKey: 'tiktokId',
    idLabel: 'Pixel ID',
    tagline: 'Let TikTok know which ads are driving real results on your website.',
    quickAnswer:
      "Enable this if you run TikTok ads or plan to. Skip it if you don't advertise on TikTok or if it's already in your Google Tag Manager.",
  },
  {
    id: 'bing',
    title: 'Microsoft (Bing) UET Tag',
    color: '#00A4EF',
    placeholder: '12345678',
    toggleKey: 'bingEnabled',
    idKey: 'bingId',
    idLabel: 'UET Tag ID',
    tagline: "Track conversions from Bing, Yahoo, and Microsoft's ad network.",
    quickAnswer:
      "Enable this if you run Microsoft/Bing ads. The audience is smaller than Google but often cheaper and higher-converting for service businesses. Skip if it's already in GTM.",
  },
  {
    id: 'pinterest',
    title: 'Pinterest Tag',
    color: '#E60023',
    placeholder: '1234567890123',
    toggleKey: 'pinterestEnabled',
    idKey: 'pinterestId',
    idLabel: 'Tag ID',
    tagline: 'Measure which Pins and ads drive visits and actions on your site.',
    quickAnswer:
      "Enable this if your business is visual and you run Pinterest ads — home services, design, real estate. Skip if you don't use Pinterest for marketing or it's in GTM.",
  },
  {
    id: 'nextdoor',
    title: 'Nextdoor Conversion Pixel',
    color: '#8ED500',
    placeholder: '12345',
    toggleKey: 'nextdoorEnabled',
    idKey: 'nextdoorId',
    idLabel: 'Pixel ID',
    tagline: 'See which Nextdoor ads are bringing neighbors to your website.',
    quickAnswer:
      "Great for local service businesses advertising on Nextdoor. Skip if you don't run Nextdoor ads or it's already in your Google Tag Manager.",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccordionItem({
  title,
  content,
  isLast,
}: {
  title: string;
  content: React.ReactNode;
  isLast: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid #e2e8f0' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          backgroundColor: isOpen ? '#f8fafc' : '#fff',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '15px',
          fontWeight: '600',
          color: '#1e293b',
          transition: 'background-color 0.2s ease',
        }}
      >
        {title}
        <span
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: '#64748b',
          }}
        >
          ▼
        </span>
      </button>
      {isOpen && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fff',
            fontSize: '14px',
            color: '#475569',
            lineHeight: '1.6',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

function DoubleFiringWarning() {
  return (
    <div
      style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fca5a5',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '24px',
      }}
    >
      <h4
        style={{
          margin: '0 0 8px 0',
          fontSize: '15px',
          color: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '18px' }}>⚠️</span> Important: Double-firing risk detected
      </h4>
      <p style={{ margin: 0, fontSize: '14px', color: '#991b1b', lineHeight: '1.5' }}>
        You have Google Tag Manager enabled along with other individual tracking pixels. If those
        pixels are also configured inside your GTM container, they will load twice — inflating your
        analytics and over-reporting conversions. <strong>Pick one approach:</strong> manage everything
        through GTM, or enable each platform individually here. Not both.
      </p>
    </div>
  );
}

function RecommendationCallout({
  platform,
  values,
}: {
  platform: PlatformDef;
  values: TrackingValues;
}) {
  const isEnabled = values[platform.toggleKey] as boolean;
  const idValue = values[platform.idKey] as string;
  const isGtmEnabled = values.gtmEnabled;
  const isDoubleFiringRisk = isGtmEnabled && isEnabled && platform.id !== 'gtm';
  const isOtherEnabledWhileGtm =
    platform.id === 'gtm' &&
    isEnabled &&
    (values.ga4Enabled ||
      values.metaEnabled ||
      values.linkedinEnabled ||
      values.tiktokEnabled ||
      values.bingEnabled ||
      values.pinterestEnabled ||
      values.nextdoorEnabled);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {isOtherEnabledWhileGtm && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#92400e', lineHeight: '1.5' }}>
            <strong>⚠️ Heads up:</strong> You also have individual tracking pixels enabled below. If
            those same pixels are already configured inside this GTM container, they'll fire twice —
            inflating your data. Either manage everything through GTM, or disable GTM and enable each
            platform individually. Not both.
          </p>
        </div>
      )}

      {isDoubleFiringRisk && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#991b1b', lineHeight: '1.5' }}>
            <strong>⚠️ Double-firing risk:</strong> Google Tag Manager is also enabled. If{' '}
            {platform.title} is already configured in your GTM container, you're double-counting.
            Pick one approach.
          </p>
        </div>
      )}

      {!isEnabled ? (
        <div
          style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#0369a1', lineHeight: '1.5' }}>
            <strong>ℹ️ Should I enable this?</strong> {platform.quickAnswer}
          </p>
        </div>
      ) : idValue ? (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#166534', lineHeight: '1.5' }}>
            <strong>✓ You're all set.</strong> {platform.title} is active and tracking. Your{' '}
            {platform.idLabel} is configured.
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#92400e', lineHeight: '1.5' }}>
            <strong>⚠️ Action required:</strong> You've enabled {platform.title} but haven't entered
            your {platform.idLabel} yet. Paste it below to start tracking.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Core Settings Page ───────────────────────────────────────────────────────

interface TrackingSettingsPageProps {
  values: TrackingValues;
  onChange: (values: TrackingValues) => void;
}

function TrackingSettingsPage({ values, onChange }: TrackingSettingsPageProps) {
  const [activePlatform, setActivePlatform] = useState<PlatformId | null>(null);

  const handleToggle = (key: keyof TrackingValues, checked: boolean) => {
    onChange({ ...values, [key]: checked });
  };

  const handleTextChange = (key: keyof TrackingValues, text: string) => {
    onChange({ ...values, [key]: text });
  };

  const isGtmEnabled = values.gtmEnabled;
  const isOtherEnabled =
    values.ga4Enabled ||
    values.metaEnabled ||
    values.linkedinEnabled ||
    values.tiktokEnabled ||
    values.bingEnabled ||
    values.pinterestEnabled ||
    values.nextdoorEnabled;
  const showDoubleFiringWarning = isGtmEnabled && isOtherEnabled;

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
        color: '#1e293b',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
          Tracking Settings
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
          Configure your analytics and tracking pixels. Click any platform to manage its settings and
          view setup instructions.
        </p>
      </div>

      {activePlatform === null ? (
        // ── Overview grid ──────────────────────────────────────────────────────
        <div>
          {showDoubleFiringWarning && <DoubleFiringWarning />}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {PLATFORMS.map((platform) => {
              const isEnabled = values[platform.toggleKey] as boolean;
              const idValue = values[platform.idKey] as string;
              const Logo = PLATFORM_LOGOS[platform.id];
              const showGtmActiveNote = isGtmEnabled && platform.id !== 'gtm';
              const showGtmOwnerNote = platform.id === 'gtm' && isEnabled && isOtherEnabled;

              return (
                <div
                  key={platform.id}
                  onClick={() => setActivePlatform(platform.id)}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '20px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = platform.color;
                    e.currentTarget.style.boxShadow =
                      '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Logo size={24} />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                      {platform.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isEnabled ? '#22c55e' : '#cbd5e1',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: isEnabled ? '#15803d' : '#64748b',
                      }}
                    >
                      {isEnabled ? 'Active' : 'Not configured'}
                    </span>
                  </div>

                  {isEnabled && idValue && (
                    <div
                      style={{
                        marginTop: '4px',
                        padding: '6px 10px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        color: '#475569',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {idValue}
                    </div>
                  )}

                  {showGtmOwnerNote && (
                    <div
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#92400e',
                        lineHeight: '1.4',
                      }}
                    >
                      ⚠️ Other pixels are also enabled. If they're inside your GTM container, they'll
                      fire twice.
                    </div>
                  )}

                  {showGtmActiveNote && (
                    <div
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#0369a1',
                        lineHeight: '1.4',
                      }}
                    >
                      ℹ️ GTM is active. Check your container before enabling — this pixel may already
                      be loaded.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // ── Detail view ────────────────────────────────────────────────────────
        <div>
          <button
            onClick={() => setActivePlatform(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
              marginBottom: '24px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            <span style={{ fontSize: '16px' }}>←</span> Back to Overview
          </button>

          {(() => {
            const platform = PLATFORMS.find((p) => p.id === activePlatform)!;
            const isEnabled = values[platform.toggleKey] as boolean;
            const idValue = values[platform.idKey] as string;
            const Logo = PLATFORM_LOGOS[platform.id];

            return (
              <div style={{ maxWidth: '800px' }}>
                {/* Hero card */}
                <div
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '32px',
                    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    <Logo size={40} />
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#1e293b' }}>
                      {platform.title}
                    </h2>
                  </div>

                  <p
                    style={{
                      margin: '0 0 24px 0',
                      fontSize: '16px',
                      color: '#475569',
                      lineHeight: '1.5',
                    }}
                  >
                    {platform.tagline}
                  </p>

                  <RecommendationCallout platform={platform} values={values} />

                  {/* Configuration block */}
                  <div
                    style={{
                      marginTop: '32px',
                      paddingTop: '32px',
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px',
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                        Enable Tracking
                      </h3>

                      {/* Toggle switch */}
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => handleToggle(platform.toggleKey, e.target.checked)}
                            style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                          />
                          <div
                            style={{
                              width: '44px',
                              height: '24px',
                              backgroundColor: isEnabled ? '#22c55e' : '#cbd5e1',
                              borderRadius: '9999px',
                              transition: 'background-color 0.2s ease',
                              position: 'relative',
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: '2px',
                                left: isEnabled ? '22px' : '2px',
                                width: '20px',
                                height: '20px',
                                backgroundColor: '#fff',
                                borderRadius: '50%',
                                transition: 'left 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                              }}
                            />
                          </div>
                        </div>
                        <span
                          style={{
                            marginLeft: '12px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: isEnabled ? '#15803d' : '#64748b',
                          }}
                        >
                          {isEnabled ? 'Active' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    <div
                      style={{ opacity: isEnabled ? 1 : 0.6, transition: 'opacity 0.2s ease' }}
                    >
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#475569',
                        }}
                      >
                        {platform.idLabel}
                      </label>
                      <input
                        type="text"
                        value={idValue}
                        onChange={(e) => handleTextChange(platform.idKey, e.target.value)}
                        disabled={!isEnabled}
                        placeholder={platform.placeholder}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          backgroundColor: isEnabled ? '#fff' : '#f1f5f9',
                          color: isEnabled ? '#0f172a' : '#94a3b8',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onFocus={(e) => {
                          if (isEnabled) {
                            e.target.style.borderColor = platform.color;
                            e.target.style.boxShadow = `0 0 0 3px ${platform.color}20`;
                          }
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#cbd5e1';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      {!isEnabled && (
                        <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                          Enable this platform to enter your ID.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Setup guide accordions */}
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                  Setup Guide
                </h3>
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {HELP_CONTENT[platform.id].map((section, idx) => (
                    <AccordionItem
                      key={idx}
                      title={section.title}
                      content={section.content}
                      isLast={idx === HELP_CONTENT[platform.id].length - 1}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Admin Wrapper — loads/saves via plugin API ───────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function TrackingSettingsAdmin() {
  const api = usePluginAPI();
  const [values, setValues] = useState<TrackingValues | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Serialized save queue: only one request in-flight at a time.
  // If values change while a request is in-flight, the latest snapshot is held
  // in savePending and dispatched immediately when the current request settles.
  // This prevents an earlier slow response from overwriting a newer fast one.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlight = useRef(false);
  const savePending = useRef<TrackingValues | null>(null);

  useEffect(() => {
    void api.get<TrackingValues>('tracking/settings').then(setValues);
  }, [api]);

  const dispatchSave = useCallback(
    (snapshot: TrackingValues) => {
      saveInFlight.current = true;
      savePending.current = null;
      void api
        .post<{ ok: boolean }>('tracking/save', snapshot)
        .then(() => {
          saveInFlight.current = false;
          const queued = savePending.current;
          if (queued) {
            // A newer snapshot arrived while we were in-flight — send it now.
            dispatchSave(queued);
          } else {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
          }
        })
        .catch(() => {
          saveInFlight.current = false;
          savePending.current = null;
          setSaveStatus('error');
        });
    },
    [api],
  );

  const handleChange = useCallback(
    (next: TrackingValues) => {
      setValues(next);
      setSaveStatus('saving');

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (saveInFlight.current) {
          // Request already in-flight — queue this snapshot; dispatchSave will
          // pick it up the moment the current request settles.
          savePending.current = next;
        } else {
          dispatchSave(next);
        }
      }, 600);
    },
    [dispatchSave],
  );

  if (!values) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '14px',
        }}
      >
        Loading tracking settings…
      </div>
    );
  }

  return (
    <div>
      {/* Save status banner */}
      {saveStatus !== 'idle' && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            padding: '10px 24px',
            fontSize: '13px',
            fontWeight: '500',
            textAlign: 'center',
            backgroundColor:
              saveStatus === 'error'
                ? '#fef2f2'
                : saveStatus === 'saved'
                  ? '#f0fdf4'
                  : '#f8fafc',
            color:
              saveStatus === 'error'
                ? '#991b1b'
                : saveStatus === 'saved'
                  ? '#166534'
                  : '#64748b',
            borderBottom: '1px solid',
            borderColor:
              saveStatus === 'error'
                ? '#fca5a5'
                : saveStatus === 'saved'
                  ? '#bbf7d0'
                  : '#e2e8f0',
          }}
        >
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved' && '✓ Changes saved'}
          {saveStatus === 'error' && '⚠ Error saving — please try again'}
        </div>
      )}

      <TrackingSettingsPage values={values} onChange={handleChange} />
    </div>
  );
}
