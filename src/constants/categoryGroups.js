import CATEGORIES from './categories';

const groups = [
  { label: 'General', ids: [9] },
  { label: 'Science & Nature', ids: [17, 18, 19, 27, 30] },
  { label: 'Entertainment', ids: [10, 11, 12, 13, 14, 15, 16, 26, 29, 31, 32] },
  { label: 'Culture & Society', ids: [20, 22, 23, 24, 25] },
  { label: 'Sports & Transport', ids: [21, 28] },
];

export default groups.map((group) => ({
  label: group.label,
  categories: group.ids.map((id) =>
    CATEGORIES.find((category) => category.value === id)
  ),
}));
