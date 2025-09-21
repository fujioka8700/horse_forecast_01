type User = {
  _id: string;
  name: string;
  email: string;
  age: number;
};

async function getUsers() {
  const res = await fetch('http://localhost:3000/api/users', {
    cache: 'no-store', // 常に最新のデータを取得
  });

  if (!res.ok) {
    throw new Error('Failed to fetch users');
  }

  return res.json();
}

export default async function Page() {
  const { data: users } = await getUsers();

  return (
    <div>
      <h1>ユーザー一覧</h1>
      <ul>
        {users.map((user: User) => (
          <li key={user._id}>
            <strong>名前:</strong> {user.name} | <strong>Eメール:</strong>{' '}
            {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
