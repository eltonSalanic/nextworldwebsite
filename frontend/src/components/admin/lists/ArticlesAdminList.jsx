import useFetch from '../../../hooks/useFetch.jsx';
import useDelete from '../../../hooks/useDelete.jsx';
import { getArticles, deleteArticleById } from '../../../services/articlesService.js';
import ItemsList from '../ItemsList.jsx';
import ItemCard from '../ItemCard.jsx';
import H3 from '../../ui/H3.jsx';
import Anchor from '../../ui/Anchor.jsx';
import LoadingSpinner from '../../ui/LoadingSpinner.jsx';
import ErrorMessage from '../../ui/ErrorMessage.jsx';

import InfoMessage from '../../ui/InfoMessage.jsx';

export default function ArticleAdminList({ onEditClick }) {
  const { isPending, isError, data: articles } = useFetch({ queryFn: getArticles, queryKey: ['articles'], config: { staleTime: 10 * 60 * 1000 } });
  const { isPending: isDeletePending, isError: isDeleteError, mutate: deleteArticle } = useDelete({ mutationFn: deleteArticleById, queryKey: ['articles'] });

  return (
    <ItemsList itemsName="Articles">
      {true ? <div className="w-full h-full flex justify-center items-center"><LoadingSpinner className="h-20 w-20" /></div> :
        isError ? <ErrorMessage>Could not get articles</ErrorMessage> :
          articles.length === 0 ? <InfoMessage>No articles to display</InfoMessage> :
            articles.map((article) => {
              return (
                <ItemCard key={article.id} onDelete={() => deleteArticle(article.id)} onEdit={() => onEditClick(article)}>
                  <H3>{article.title}</H3>
                  <Anchor>{article.link}</Anchor>
                </ItemCard>
              )
            })}

      {isDeletePending && <Loading />}
      {isDeleteError && <ErrorMessage>Could not delete article</ErrorMessage>}
    </ItemsList>
  )
}