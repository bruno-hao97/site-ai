import { useNavigate } from 'react-router-dom';
import {
  feedMediaUrl,
  feedThumb,
  type FeedItem,
} from '../services/feedApi';
import { feedItemJobType, navigateReuseFeedItem } from '../utils/feedItemReuse';
import ComposerLibraryPreviewModal, {
  type ComposerPreviewHandlers,
} from './ComposerLibraryPreviewModal';

export default function HomeFeedPreview({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: FeedItem[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const navigate = useNavigate();
  const item = items[index];
  if (!item) return null;

  const jobType = feedItemJobType(item);
  const kind = jobType === 'image' ? 'image' : 'video';
  const mediaUrl = feedMediaUrl(item) || feedThumb(item) || '';

  const handlers: ComposerPreviewHandlers = {
    onRegenerate: () => {
      navigateReuseFeedItem(navigate, item);
      onClose();
    },
    onCreateVideo:
      kind === 'image' && mediaUrl
        ? () => {
            navigateReuseFeedItem(navigate, item, {
              asType: 'video',
              withMediaAsReference: true,
            });
            onClose();
          }
        : undefined,
    onEdit:
      mediaUrl
        ? () => {
            navigateReuseFeedItem(navigate, item, {
              asType: 'image',
              withMediaAsReference: true,
            });
            onClose();
          }
        : undefined,
  };

  return (
    <ComposerLibraryPreviewModal
      items={items}
      index={index}
      kind={kind}
      onClose={onClose}
      onNavigate={onNavigate}
      handlers={handlers}
    />
  );
}
