import * as SecureStore from 'expo-secure-store';
import { loadDirection, saveDirection, clearDirection } from '@/lib/healthkit/storage';

const getMock = SecureStore.getItemAsync as jest.Mock;
const setMock = SecureStore.setItemAsync as jest.Mock;
const delMock = SecureStore.deleteItemAsync as jest.Mock;

describe('healthkit storage', () => {
  beforeEach(() => {
    getMock.mockReset();
    setMock.mockReset();
    delMock.mockReset();
  });

  it('loads a previously stored direction', async () => {
    getMock.mockResolvedValueOnce('readWrite');
    const d = await loadDirection('user-1');
    expect(getMock).toHaveBeenCalledWith('healthkit.direction.user-1');
    expect(d).toBe('readWrite');
  });

  it('defaults to off when nothing stored', async () => {
    getMock.mockResolvedValueOnce(null);
    const d = await loadDirection('user-1');
    expect(d).toBe('off');
  });

  it('defaults to off when stored value is unrecognized', async () => {
    getMock.mockResolvedValueOnce('garbage');
    const d = await loadDirection('user-1');
    expect(d).toBe('off');
  });

  it('saves a direction under the per-user key', async () => {
    setMock.mockResolvedValueOnce(undefined);
    await saveDirection('user-1', 'read');
    expect(setMock).toHaveBeenCalledWith('healthkit.direction.user-1', 'read');
  });

  it('clears the per-user key', async () => {
    delMock.mockResolvedValueOnce(undefined);
    await clearDirection('user-1');
    expect(delMock).toHaveBeenCalledWith('healthkit.direction.user-1');
  });
});
