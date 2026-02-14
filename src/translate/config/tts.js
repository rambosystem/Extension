/**
 * 豆包 TTS 配置（单向流式 HTTP V3）
 * https://www.volcengine.com/docs/6561/1598757
 *
 * 覆盖方式：chrome.storage.local 中设置 doubao_tts_app_id / doubao_tts_access_token
 * 注意：根目录 background.js 内有一份副本，修改此处后请同步 background.js 中的 TTS_* 常量。
 */

export const TTS_API_URL =
  "https://openspeech.bytedance.com/api/v3/tts/unidirectional";

export const X_API_RESOURCE_ID = "seed-tts-1.0";

/** 默认凭证；优先使用 storage 中的值 */
export const DEFAULT_APP_ID = "9475898476";
export const DEFAULT_ACCESS_TOKEN = "pvrswIGZenbzLPfDB2jlDD4pAVf2CeNT";

/** 发音人（V3 为 speaker），默认 Glen */
export const DEFAULT_VOICE_TYPE = "en_male_glen_emo_v2_mars_bigtts";

/** chrome.storage.local 的 key */
export const STORAGE_KEYS = {
  APP_ID: "doubao_tts_app_id",
  ACCESS_TOKEN: "doubao_tts_access_token",
  /** 发音方式：doubao | browser */
  PROVIDER: "doubao_tts_provider",
  /** 豆包音色 voice_type */
  VOICE_TYPE: "doubao_tts_voice_type",
};

export const TTS_VOICE_TYPES = [
  {
    label: "American English",
    options: [
      { label: "Lauren", value: "en_female_lauren_moon_bigtts" },
      {
        label: "Energetic Male II",
        value: "en_male_campaign_jamal_moon_bigtts",
      },
      { label: "Gotham Hero", value: "en_male_chris_moon_bigtts" },
      { label: "Flirty Female", value: "en_female_product_darcie_moon_bigtts" },
      { label: "Peaceful Female", value: "en_female_emotional_moon_bigtts" },
      { label: "Nara", value: "en_female_nara_moon_bigtts" },
      { label: "Bruce", value: "en_male_bruce_moon_bigtts" },
      { label: "Michael (Moon)", value: "en_male_michael_moon_bigtts" },
      { label: "Cartoon Chef", value: "ICL_en_male_cc_sha_v1_tob" },
      { label: "Lucas", value: "zh_male_M100_conversation_wvae_bigtts" },
      { label: "Sophie", value: "zh_female_sophie_conversation_wvae_bigtts" },
      { label: "Daisy", value: "en_female_dacey_conversation_wvae_bigtts" },
      { label: "Owen", value: "en_male_charlie_conversation_wvae_bigtts" },
      { label: "Luna", value: "en_female_sarah_new_conversation_wvae_bigtts" },
      { label: "Michael (Tob)", value: "ICL_en_male_michael_tob" },
      { label: "Charlie", value: "ICL_en_female_cc_cm_v1_tob" },
      { label: "Big Boogie", value: "ICL_en_male_oogie2_tob" },
      { label: "Frosty Man", value: "ICL_en_male_frosty1_tob" },
      { label: "The Grinch", value: "ICL_en_male_grinch2_tob" },
      { label: "Zayne", value: "ICL_en_male_zayne_tob" },
      { label: "Jigsaw", value: "ICL_en_male_cc_jigsaw_tob" },
      { label: "Chucky", value: "ICL_en_male_cc_chucky_tob" },
      { label: "Clown Man", value: "ICL_en_male_cc_penny_v1_tob" },
      { label: "Kevin McCallister", value: "ICL_en_male_kevin2_tob" },
      { label: "Xavier", value: "ICL_en_male_xavier1_v1_tob" },
      { label: "Noah", value: "ICL_en_male_cc_dracula_v1_tob" },
      { label: "Adam", value: "en_male_adam_mars_bigtts" },
      { label: "Amanda", value: "en_female_amanda_mars_bigtts" },
      { label: "Jackson", value: "en_male_jackson_mars_bigtts" },
      { label: "Candice", value: "en_female_candice_emo_v2_mars_bigtts" },
      { label: "Serena", value: "en_female_skye_emo_v2_mars_bigtts" },
      { label: "Glen", value: "en_male_glen_emo_v2_mars_bigtts" },
      { label: "Sylus", value: "en_male_sylus_emo_v2_mars_bigtts" },
      { label: "Shiny", value: "zh_female_cancan_mars_bigtts" },
      { label: "Skye", value: "zh_female_shuangkuaisisi_moon_bigtts" },
      { label: "Alvin", value: "zh_male_wennuanahu_moon_bigtts" },
      { label: "Brayan", value: "zh_male_shaonianzixin_moon_bigtts" },
    ],
  },
  {
    label: "British English",
    options: [
      { label: "Delicate Girl", value: "en_female_daisy_moon_bigtts" },
      { label: "Dave", value: "en_male_dave_moon_bigtts" },
      { label: "Hades", value: "en_male_hades_moon_bigtts" },
      { label: "Onez", value: "en_female_onez_moon_bigtts" },
      { label: "Emily", value: "en_female_emily_mars_bigtts" },
      { label: "Daniel", value: "zh_male_xudong_conversation_wvae_bigtts" },
      { label: "Alastor", value: "ICL_en_male_cc_alastor_tob" },
      { label: "Smith", value: "en_male_smith_mars_bigtts" },
      { label: "Anna", value: "en_female_anna_mars_bigtts" },
      { label: "Corey", value: "en_male_corey_emo_v2_mars_bigtts" },
      { label: "Nadia", value: "en_female_nadia_tips_emo_v2_mars_bigtts" },
    ],
  },
  {
    label: "Australian English",
    options: [
      { label: "Ethan", value: "ICL_en_male_aussie_v1_tob" },
      { label: "Sarah", value: "en_female_sarah_mars_bigtts" },
      { label: "Unknown Male", value: "en_male_dryw_mars_bigtts" },
    ],
  },
];
