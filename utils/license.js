export function getUserLicenseProfile() {
  return {
    userType: 'pro',
    isPro: true,
    monthlyLimit: 999999,
    expireAt: null,
    activatedAt: Date.now(),
    licenseVersion: 'MR1'
  };
}

export function getSummaryQuotaSnapshot() {
  return {
    userType: 'pro',
    isPro: true,
    limit: 999999,
    used: 0,
    remaining: 999999,
    monthKey: 'unlimited',
    expireAt: null
  };
}

export function canConsumeSummaryQuota() {
  return {
    allowed: true,
    message: ''
  };
}

export function consumeSummaryQuota() {
  return {
    success: true,
    allowed: true,
    used: 0,
    remaining: 999999
  };
}

export function activateWithCode(code) {
  return {
    success: true,
    message: '暂不开放付费，直接尊享专业版！',
    profile: getUserLicenseProfile()
  };
}

export function clearActivation() {
  return true;
}
