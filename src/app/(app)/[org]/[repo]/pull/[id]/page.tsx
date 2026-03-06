interface Props {
  params: Promise<{ org: string; repo: string; id: string }>;
}

export default async function PullRequestPage({ params }: Props) {
  const { org, repo, id } = await params;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">
        {org}/{repo} #{id}
      </h1>
      <p className="mt-2 text-muted-foreground">Pull request review page. Coming soon.</p>
    </div>
  );
}
