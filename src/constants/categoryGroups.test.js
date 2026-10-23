import groups from './categoryGroups';
import categories from './categories';
test('groups every subject once without changing API category ids', () => {
  const ids = groups.flatMap((group) =>
    group.categories.map((category) => category.value)
  );
  expect([...ids].sort((a, b) => a - b)).toEqual(
    categories
      .filter((category) => category.value !== '0')
      .map((category) => category.value)
      .sort((a, b) => a - b)
  );
  expect(new Set(ids).size).toBe(ids.length);
});
