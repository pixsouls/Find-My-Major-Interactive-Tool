import Modal from './Modal';
import MajorDetailContent from './MajorDetailContent';
import type { CareerMajor } from '../utils/api';

interface Props {
  major: CareerMajor;
  onClose: () => void;
}

/** Standalone major detail, opened from the Career Information panel. */
export default function MajorDetailModal({ major, onClose }: Props) {
  return (
    <Modal title={major.major_name} onClose={onClose}>
      <MajorDetailContent major={major} />
    </Modal>
  );
}
