import { accountService } from '@services/account.service';
import { sendSuccess } from '@helpers/apiResponse';
import { asyncHandler } from '@utils/asyncHandler';

export const accountController = {
  get: asyncHandler(async (req, res) => { sendSuccess(res, await accountService.preferences(req.user!.id), 'Account preferences'); }),
  save: asyncHandler(async (req, res) => { sendSuccess(res, await accountService.savePreferences(req.user!.id, req.body), 'Preferences saved'); }),
  password: asyncHandler(async (req, res) => { await accountService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword); sendSuccess(res, null, 'Password changed'); }),
  marriage: asyncHandler(async (req, res) => { await accountService.reportMarriage(req.user!.id, req.body); sendSuccess(res, null, 'Marriage status submitted'); }),
  requestDeletion: asyncHandler(async (req, res) => { await accountService.requestDeletion(req.user!.id); sendSuccess(res, null, 'Confirmation OTP sent'); }),
  delete: asyncHandler(async (req, res) => { await accountService.deleteAccount(req.user!.id, req.body.code); sendSuccess(res, null, 'Account deleted'); }),
};