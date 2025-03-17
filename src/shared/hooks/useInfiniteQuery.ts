import { useEffect, useRef, useCallback } from 'react';
import { useQuery, DocumentNode } from '@apollo/client';
import * as Types from '../../__generated__/graphql';
import { RepositoriesByOwnerQuery } from '@/entities/repositories/gql/queries/repositoriesByOwner.graphql';


export type RepositoriesByOwnerQueryVariables = Types.Exact<{
  login: Types.Scalars['String']['input'];
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  after?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;

interface UseInfiniteQueryProps<TData extends RepositoriesByOwnerQuery> {
  query: DocumentNode;
  variables: RepositoriesByOwnerQueryVariables;
  getNextPageParam: (data: TData) => string | undefined;
  skip?: boolean;
}

export const useInfiniteQuery = <TData extends RepositoriesByOwnerQuery>({
  query,
  variables,
  getNextPageParam,
  skip = false,
}: UseInfiniteQueryProps<TData>) => {
  const { data, loading, fetchMore, error } = useQuery<
    TData,
    RepositoriesByOwnerQueryVariables
  >(query, {
    variables,
    notifyOnNetworkStatusChange: true,
    skip,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      if (entry.isIntersecting && !loading && data) {
        const cursor = getNextPageParam(data);

        if (cursor) {
          fetchMore({
            variables: { ...variables, after: cursor },
            updateQuery: (prev, { fetchMoreResult }) => {
              if (!fetchMoreResult) return prev;

              return {
                ...prev,
                repositoryOwner: {
                  ...fetchMoreResult.repositoryOwner,
                  repositories: {
                    ...fetchMoreResult.repositoryOwner?.repositories,
                    nodes: [
                      ...(prev.repositoryOwner?.repositories.nodes || []),
                      ...(fetchMoreResult.repositoryOwner?.repositories.nodes ||
                        []),
                    ],
                    pageInfo:
                      fetchMoreResult.repositoryOwner?.repositories.pageInfo,
                  },
                },
              };
            },
          });
        }
      }
    },
    [loading, data, fetchMore, variables, getNextPageParam]
  );

  useEffect(() => {
    const currentEl = sentinelRef.current;
    if (!currentEl) return;

    // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
    // https://caniuse.com/intersectionobserver
    const observer = new IntersectionObserver(handleIntersect, { threshold: 1 });

    observer.observe(currentEl);

    return () => observer.disconnect();
  }, [handleIntersect]);

  return { data, loading, error, sentinelRef };
};
