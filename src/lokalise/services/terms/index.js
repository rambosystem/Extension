/**
 * Terms Service Index
 * 统一导出术语服务的所有公共API
 */

export {
  fetchUserTermsStatus,
  fetchUserTerms,
  fetchCurrentUserTerms,
  addUserTerms,
  fetchUserEmbeddingStatus,
  rebuildUserEmbedding,
  updateIndex,
  deleteTermIndex,
  deleteUserTerm,
} from "./termsService.js";
