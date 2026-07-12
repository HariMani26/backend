import { compareSecret, hashSecret } from '@utils/password';

describe('hashSecret / compareSecret', () => {
  it('round-trips a matching secret', async () => {
    const hash = await hashSecret('correct horse battery staple');
    await expect(compareSecret('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('rejects a non-matching secret', async () => {
    const hash = await hashSecret('correct horse battery staple');
    await expect(compareSecret('wrong password', hash)).resolves.toBe(false);
  });

  it('never stores the plaintext in the hash', async () => {
    const secret = 'plaintext-should-not-appear';
    const hash = await hashSecret(secret);
    expect(hash).not.toContain(secret);
  });
});
